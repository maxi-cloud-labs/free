#!/bin/sh

REV=v2.7.2
IMMICH_PATH=/usr/local/modules/immich
APP=$IMMICH_PATH/app
export NODE_OPTIONS="--max-old-space-size=4096"
mkdir -p $APP
mkdir -p /var/log/immich
TMP=/home/ai/build/immich
rm -rf $TMP

cd /home/ai/build
git clone https://github.com/immich-app/immich $TMP --depth=1 -b $REV
cd $TMP
git reset --hard $REV
rm -rf .git
grep -Rl /usr/src | xargs -n1 sed -i -e "s@/usr/src@$IMMICH_PATH@g"
mkdir -p $IMMICH_PATH/cache
grep -RlE "\"/build\"|'/build'" | xargs -n1 sed -i -e "s@\"/build\"@\"$APP\"@g" -e "s@'/build'@'$APP'@g"
corepack use pnpm@latest

cd server
pnpm install --frozen-lockfile --force
pnpm run build
pnpm prune --prod --no-optional --config.ci=true
cd -

cd open-api/typescript-sdk
pnpm install --frozen-lockfile --force
pnpm run build
cd -

cd web
pnpm install --frozen-lockfile --force
pnpm run build
cd -

cd plugins
pnpm install --frozen-lockfile --force
pnpm run build
cd -

cp -aL server/node_modules server/dist server/bin $APP/
cp -a web/build $APP/www
cp -a server/package.json pnpm-lock.yaml $APP/
mkdir -p $APP/corePlugin
cp -a plugins/dist $APP/corePlugin/
cp -a plugins/manifest.json $APP/corePlugin/
cp -a LICENSE $APP/
cp -a i18n $APP/../
cd $APP
pnpm store prune
cd -

mkdir -p $APP/machine-learning
/home/ai/rootfs/usr/local/modules/_core_/pip.sh -f $APP/machine-learning/venv -v 3.12 -s
echo "PATH before any modif: $PATH"
PATHOLD=$PATH
PATH=$APP/machine-learning/venv/bin:$PATHOLD
export PATH=$APP/machine-learning/venv/bin:$PATHOLD
echo "PATH new: $PATH python: `python --version`"
pip3 install uv
cd machine-learning
uv sync --no-install-project --no-install-workspace --extra cpu --no-cache --active --link-mode=copy
cd ..
PATH=$PATHOLD
export PATH=$PATHOLD
echo "PATH restored: $PATH"
cp -a machine-learning/immich_ml $APP/machine-learning/

mkdir -p $APP/geodata
cd $APP/geodata
wget -nv --show-progress --progress=bar:force:noscroll https://download.geonames.org/export/dump/admin1CodesASCII.txt
wget -nv --show-progress --progress=bar:force:noscroll https://download.geonames.org/export/dump/admin2Codes.txt
wget -nv --show-progress --progress=bar:force:noscroll https://download.geonames.org/export/dump/cities500.zip
wget -nv --show-progress --progress=bar:force:noscroll https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson
unzip cities500.zip
date --iso-8601=seconds | tr -d "\n" > geodata-date.txt
rm cities500.zip

cd $APP
pnpm install sharp

ln -sf /disk/admin/modules/immich/upload $APP/
ln -sf /disk/admin/modules/immich/upload $APP/machine-learning/
