#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset litellm##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
DBPASSP=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)
KEY=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop litellm.service
rm -rf /disk/admin/modules/litellm
mkdir /disk/admin/modules/litellm

export PGPASSWORD=`jq -r .password /disk/admin/modules/_config_/postgresql.json`
su postgres -c "psql" << EOF
DROP DATABASE IF EXISTS litellmdb;
CREATE DATABASE litellmdb;
DROP USER IF EXISTS litellmuser;
CREATE USER litellmuser WITH ENCRYPTED PASSWORD '${DBPASSP}';
GRANT ALL PRIVILEGES ON DATABASE litellmdb TO litellmuser;
\c litellmdb
GRANT ALL PRIVILEGES ON SCHEMA public TO litellmuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO litellmuser;
GRANT CREATE ON SCHEMA public TO litellmuser;
\q
EOF
unset PGPASSWORD

cat > /disk/admin/modules/litellm/config.yaml << EOF
model_list:
  - model_name: gpt-4o
    litellm_params:
      model: gpt-4o
      api_key: "os.environ/OPENAI_API_KEY"

general_settings:
  database_url: "postgresql://litellmuser:${DBPASSP}@localhost:5432/litellmdb?sslmode=disable"
EOF

cat > /disk/admin/modules/litellm/env << EOF
LITELLM_MASTER_KEY=sk-${KEY}
UI_USERNAME=${CLOUDNAME}
UI_PASSWORD=${PASSWD}
DOCS_URL=/docs
ROOT_REDIRECT_URL=/ui
EOF

export DATABASE_URL="postgresql://litellmuser:${DBPASSP}@localhost:5432/litellmdb?sslmode=disable"
export PYTHONPATH=/usr/local/modules/litellm/lib/python3.12/site-packages
export PATH=/usr/local/modules/litellm/bin:$PATH
/usr/local/modules/litellm/bin/litellm --config /disk/admin/modules/litellm/config.yaml --skip_server_startup
#USE_PRISMA_MIGRATE="True" /usr/local/modules/litellm/bin/litellm --config /disk/admin/modules/litellm/config.yaml --skip_server_startup

echo "{\"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"key\":\"sk-${KEY}\", \"dbname\":\"litellmdb\", \"dbuser\":\"litellmuser\", \"dbpass\":\"${DBPASSP}\"}" > /disk/admin/modules/_config_/litellm.json
chown admin:admin /disk/admin/modules/_config_/litellm.json

systemctl start litellm.service
systemctl enable litellm.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
