#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset mastodon##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.mydongle.cloud"
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
SECRET_KEY_BASE=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 64)
DBPASSP=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)

systemctl stop mastodon.service
rm -rf /disk/admin/modules/mastodon
mkdir /disk/admin/modules/mastodon

export PGPASSWORD=`jq -r .password /disk/admin/modules/_config_/postgresql.json`
su postgres -c "psql" << EOF
DROP DATABASE IF EXISTS mastodondb;
DROP USER IF EXISTS mastodonuser;
CREATE USER mastodonuser WITH ENCRYPTED PASSWORD '${DBPASSP}';
CREATE DATABASE mastodondb OWNER mastodonuser;
\c mastodondb
GRANT ALL ON SCHEMA public TO mastodonuser;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\dx
\q
EOF
unset PGPASSWORD

SECRET_KEY_BASE=$(openssl rand -hex 64)
ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=$(openssl rand -base64 32)
ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=$(openssl rand -base64 32)
ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=$(openssl rand -base64 32)
rm -f tmpkey
openssl ecparam -name prime256v1 -genkey -noout -out tmpkey 2>/dev/null
VAPID_PRIVATE_KEY=$(openssl ec -in tmpkey -outform DER 2>/dev/null | tail -c +8 | head -c 32 | base64 -w 0 | tr '+/' '-_' | tr -d '=')
VAPID_PUBLIC_KEY=$(openssl ec -in tmpkey -pubout -outform DER 2>/dev/null | tail -c 65 | base64 -w 0 | tr '+/' '-_' | tr -d '=')
rm -f tmpkey
OTP_SECRET=$(openssl rand -hex 64)

cat > /disk/admin/modules/mastodon/env << EOF
LOCAL_DOMAIN=social.${PRIMARY}
SINGLE_USER_MODE=false
SECRET_KEY_BASE=${SECRET_KEY_BASE}
ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY=${ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY}
ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT=${ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT}
ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY=${ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mastodondb
DB_USER=mastodonuser
DB_PASS=${DBPASSP}
OTP_SECRET=${OTP_SECRET}
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
SMTP_SERVER=localhost
SMTP_PORT=465
SMTP_AUTH_METHOD=none
SMTP_OPENSSL_VERIFY_MODE=none
SMTP_ENABLE_STARTTLS=auto
SMTP_FROM_ADDRESS='${CLOUDNAME} <${EMAIL}>'
UPDATE_CHECK_URL=
PORT=8112
RAILS_SERVE_STATIC_FILES=true
EOF
cd /usr/local/modules/mastodon
RAILS_ENV=production bundle exec rake db:schema:load db:seed
response=$(RAILS_ENV=production bin/tootctl accounts create ${CLOUDNAME} --email ${EMAIL} --confirmed --role Owner)
PASSWD=$(echo "$response" | grep "New password:" | awk '{print $NF}')
RAILS_ENV=production bin/tootctl accounts modify ${CLOUDNAME} --approve

systemctl start mastodon.service
systemctl enable mastodon.service

echo "{\"email\":\"${EMAIL}\", \"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"mastodondb\", \"dbuser\":\"mastodonuser\", \"dbpass\":\"${DBPASSP}\"}" > /disk/admin/modules/_config_/mastodon.json
chown admin:admin /disk/admin/modules/_config_/mastodon.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
