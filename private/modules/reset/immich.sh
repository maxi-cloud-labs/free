#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset immich##################"
systemctl stop immich-machinelearning.service
systemctl stop immich.service
SALT=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 16)
DBPASSP=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)

export PGPASSWORD=`jq -r .password /disk/admin/modules/_config_/postgresql.json`
su postgres -c "psql" << EOF
DROP DATABASE IF EXISTS immichdb;
CREATE DATABASE immichdb;
DROP USER IF EXISTS immichuser;
CREATE USER immichuser WITH ENCRYPTED PASSWORD '${DBPASSP}';
GRANT ALL PRIVILEGES ON DATABASE immichdb TO immichuser;
ALTER DATABASE immichdb OWNER TO immichuser;
\c immichdb
CREATE EXTENSION IF NOT EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
GRANT ALL PRIVILEGES ON SCHEMA public TO immichuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO immichuser;
GRANT CREATE ON SCHEMA public TO immichuser;
\q
EOF
unset PGPASSWORD

rm -rf /disk/admin/modules/immich
mkdir -p /disk/admin/modules/immich/upload

cat > /disk/admin/modules/immich/env << EOF
DB_PASSWORD=${DBPASSP}

NODE_ENV=production

DB_USERNAME=immichuser
DB_DATABASE_NAME=immichdb

UPLOAD_LOCATION=./library

IMMICH_VERSION=release

IMMICH_HOST=127.0.0.1
IMMICH_PORT=2283
MACHINE_LEARNING_PORT=3003
IMMICH_MACHINE_LEARNING_URL=http://127.0.0.1:3003
DB_HOSTNAME=127.0.0.1
REDIS_HOSTNAME=127.0.0.1
EOF

echo "{\"dbname\":\"immichdb\", \"dbuser\":\"immichuser\", \"dbpass\":\"${DBPASSP}\"}" > /disk/admin/modules/_config_/immich.json
chown admin:admin /disk/admin/modules/_config_/immich.json
chown -R admin:admin /disk/admin/modules/immich
systemctl start immich-machinelearning.service
systemctl start immich.service
systemctl enable immich-machinelearning.service
systemctl enable immich.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/immich-user.sh &
else
	/usr/local/modules/_core_/reset/immich-user.sh
fi
