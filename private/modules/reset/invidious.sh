#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset invidious##################"
systemctl stop invidiouscompanion.service
systemctl stop invidious.service
SALT=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 16)
DBPASSP=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)

export PGPASSWORD=`jq -r .password /disk/admin/modules/_config_/postgresql.json`
su postgres -c "psql" << EOF
DROP DATABASE IF EXISTS invidiousdb;
CREATE DATABASE invidiousdb;
DROP USER IF EXISTS invidioususer;
CREATE USER invidioususer WITH ENCRYPTED PASSWORD '${DBPASSP}';
GRANT ALL PRIVILEGES ON DATABASE invidiousdb TO invidioususer;
\c invidiousdb
GRANT ALL PRIVILEGES ON SCHEMA public TO invidioususer;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO invidioususer;
GRANT CREATE ON SCHEMA public TO invidioususer;
\q
EOF
unset PGPASSWORD

rm -rf /disk/admin/modules/invidious
mkdir -p /disk/admin/modules/invidious/tmp
cp /usr/local/modules/invidious/config/config.example.yml /disk/admin/modules/invidious/config.yml
sed -i -e "s/^  user:.*/  user: invidioususer/" /disk/admin/modules/invidious/config.yml
sed -i -e "s/^  password:.*/  password: ${DBPASSP}/" /disk/admin/modules/invidious/config.yml
sed -i -e "s/^  dbname:.*/  dbname: invidiousdb/" /disk/admin/modules/invidious/config.yml
sed -i -e "s/^hmac_key:.*/hmac_key: \"${SALT}\"/" /disk/admin/modules/invidious/config.yml
sed -i -e "s/^#invidious_companion:.*/invidious_companion:/" /disk/admin/modules/invidious/config.yml
sed -i -e 's@^#  \- private_url:.*@  - private_url: "http://localhost:8282/companion"@' /disk/admin/modules/invidious/config.yml
sed -i -e "s/^#invidious_companion_key:.*/invidious_companion_key: \"${SALT}\"/" /disk/admin/modules/invidious/config.yml
sed -i -e "s/^#host_binding:.*/host_binding: 127.0.0.1/" /disk/admin/modules/invidious/config.yml
sed -i -e "s/^  #default_home:.*/  default_home: Trending/" /disk/admin/modules/invidious/config.yml
cd /usr/local/modules/invidious
./invidious --migrate

echo "{\"dbname\":\"invidiousdb\", \"dbuser\":\"invidioususer\", \"dbpass\":\"${DBPASSP}\"}" > /disk/admin/modules/_config_/invidious.json
echo "SERVER_SECRET_KEY=${SALT}" > /disk/admin/modules/invidious/companion.env
chown admin:admin /disk/admin/modules/_config_/invidious.json
chown -R admin:admin /disk/admin/modules/invidious
systemctl start invidiouscompanion.service
systemctl start invidious.service
systemctl enable invidiouscompanion.service
systemctl enable invidious.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
