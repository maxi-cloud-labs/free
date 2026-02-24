#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
#	exit 0
fi

echo "#Reset pinchflat##################"
SECRET_KEY_BASE=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 64)
systemctl stop pinchflat.service
rm -rf /disk/admin/modules/pinchflat
mkdir /disk/admin/modules/pinchflat/
mkdir /disk/admin/modules/pinchflat/downloads
mkdir /disk/admin/modules/pinchflat/config
echo "SECRET_KEY_BASE=${SECRET_KEY_BASE}" > /disk/admin/modules/pinchflat/config/env
export SECRET_KEY_BASE=${SECRET_KEY_BASE}
export CONFIG_PATH=/disk/admin/modules/pinchflat/config
cd /usr/local/modules/pinchflat/_build/prod/rel/pinchflat
/usr/local/modules/pinchflat/_build/prod/rel/pinchflat/bin/pinchflat eval "Pinchflat.Release.migrate" > /dev/null
systemctl start pinchflat.service
systemctl enable pinchflat.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
