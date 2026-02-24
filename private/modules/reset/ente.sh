#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset ente##################"
dbpass=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
read -r PORTaccounts PORTauth PORTcast PORTembed PORTensu PORTphotos PORTshare << EOF
	$(jq ".enteaccounts.localPort,.enteauth.localPort,.entecast.localPort,.enteembed.localPort,.enteensu.localPort,.entephotos.localPort,.enteshare.localPort" /usr/local/modules/_core_/web/assets/modulesdefault.json | xargs)
EOF
read -r MINIOACCESS MINIOSECRET << EOF
	$(jq -r ".accessKey,.secretKey" /disk/admin/modules/_config_/minio.json | xargs)
EOF

systemctl stop ente.service
rm -rf /disk/admin/modules/ente
mkdir /disk/admin/modules/ente

export PGPASSWORD=`jq -r .password /disk/admin/modules/_config_/postgresql.json`
su postgres -c "psql" << EOF
DROP DATABASE IF EXISTS entedb;
CREATE DATABASE entedb;
DROP USER IF EXISTS enteuser;
CREATE USER enteuser WITH ENCRYPTED PASSWORD '${dbpass}';
GRANT ALL PRIVILEGES ON DATABASE entedb TO enteuser;
\c entedb
GRANT ALL PRIVILEGES ON SCHEMA public TO enteuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO enteuser;
GRANT CREATE ON SCHEMA public TO enteuser;
\q
EOF
unset PGPASSWORD

su admin sh -c 'mc rb --force local/ente'
su admin sh -c 'mc mb local/ente'

cat > /disk/admin/modules/ente/museum.yaml << EOF
http:
    port: 3200

db:
    host: localhost
    port: 5432
    name: entedb
    user: enteuser
    password: $dbpass

s3:
    are_local_buckets: true
    use_path_style_urls: true
    b2-eu-cen:
      key: ${MINIOACCESS}
      secret: ${MINIOSECRET}
      endpoint: localhost:9000
      region: us-east-1
      bucket: ente

apps:
    accounts: http://localhost:$PORTaccounts
    auth: http://localhost:$PORTauth
    cast: http://localhost:$PORTcast
    embed: http://localhost:$PORTembed
    ensu: http://localhost:$PORTensu
    photos: http://localhost:$PORTphotos
    share: http://localhost:$PORTshare
EOF

/usr/local/modules/ente/server/keys >> /disk/admin/modules/ente/museum.yaml

echo "{\"dbname\":\"entedb\", \"dbuser\":\"enteuser\", \"dbpass\":\"${dbpass}\"}" > /disk/admin/modules/_config_/ente.json
chown admin:admin /disk/admin/modules/_config_/piped.json

systemctl start ente.service
systemctl enable ente.service

echo "{ \"a\":\"status\", \"module\":\"$(basename \""$0"\" .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
