#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset litellm##################"
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
DBPASSP=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)
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
  master_key: sk-${PASSWD}
  database_url: "postgresql://litellmuser:${DBPASSP}@localhost:5432/litellmdb?sslmode=disable"
EOF

echo "{\"username\":\"admin\", \"password\":\"sk-${PASSWORD}\", \"dbname\":\"litellmdb\", \"dbuser\":\"litellmuser\", \"dbpass\":\"${DBPASSP}\"}" > /disk/admin/modules/_config_/litellm.json
chown admin:admin /disk/admin/modules/_config_/litellm.json

systemctl start litellm.service
systemctl enable litellm.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
