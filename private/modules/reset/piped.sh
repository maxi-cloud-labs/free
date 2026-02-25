#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset piped##################"
systemctl stop pipedbackend.service
systemctl stop pipedproxy.service
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
DBPASSP=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)

export PGPASSWORD=`jq -r .password /disk/admin/modules/_config_/postgresql.json`
su postgres -c "psql" << EOF
DROP DATABASE IF EXISTS pipeddb;
CREATE DATABASE pipeddb;
DROP USER IF EXISTS pipeduser;
CREATE USER pipeduser WITH ENCRYPTED PASSWORD '${DBPASSP}';
GRANT ALL PRIVILEGES ON DATABASE pipeddb TO pipeduser;
\c pipeddb
GRANT ALL PRIVILEGES ON SCHEMA public TO pipeduser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pipeduser;
GRANT CREATE ON SCHEMA public TO pipeduser;
\q
EOF
unset PGPASSWORD

rm -rf /disk/admin/modules/piped
mkdir /disk/admin/modules/piped
cat > /disk/admin/modules/piped/config.properties << EOF
PORT:8102
HTTP_WORKERS:2
PROXY_PART:https://piped.${PRIMARY}/_proxy_/
API_URL:https://piped.${PRIMARY}/_api_/
FRONTEND_URL:https://piped.${PRIMARY}
hibernate.connection.url:jdbc:postgresql://127.0.0.1:5432/pipeddb
hibernate.connection.driver_class:org.postgresql.Driver
hibernate.dialect:org.hibernate.dialect.PostgreSQLDialect
hibernate.connection.username:pipeduser
hibernate.connection.password:${DBPASSP}
COMPROMISED_PASSWORD_CHECK:false
EOF

echo "{\"dbname\":\"pipeddb\", \"dbuser\":\"pipeduser\", \"dbpass\":\"${DBPASSP}\"}" > /disk/admin/modules/_config_/piped.json
chown admin:admin /disk/admin/modules/_config_/piped.json

chown -R admin:admin /disk/admin/modules/piped
systemctl start pipedbackend.service
systemctl start pipedproxy.service
systemctl enable pipedbackend.service
systemctl enable pipedproxy.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
