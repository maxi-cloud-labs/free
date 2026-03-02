#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset ente##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.mydongle.cloud"
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
SMTPPASSWD=$(jq -r ".password" /disk/admin/modules/_config_/postfix.json)
DBPASSP=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)
read -r PORTACCOUNTS PORTAUTH PORTCAST PORTEMBED PORTENSU PORTPHOTOS PORTSHARE << EOF
	$(jq -r ".enteaccounts.localPort,.enteauth.localPort,.entecast.localPort,.enteembed.localPort,.enteensu.localPort,.entephotos.localPort,.enteshare.localPort" /usr/local/modules/_core_/web/assets/modulesdefault.json | xargs)
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
CREATE USER enteuser WITH ENCRYPTED PASSWORD '${DBPASSP}';
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
    password: ${DBPASSP}

s3:
    are_local_buckets: true
    use_path_style_urls: true
    b2-eu-cen:
      key: ${MINIOACCESS}
      secret: ${MINIOSECRET}
      endpoint: https://minios3.${PRIMARY}
      region: us-east-1
      bucket: ente

apps:
    accounts: http://localhost:$PORTACCOUNTS
    auth: http://localhost:$PORTAUTH
    cast: http://localhost:$PORTCAST
    embed: http://localhost:$PORTEMBED
    ensu: http://localhost:$PORTENSU
    photos: http://localhost:$PORTPHOTOS
    share: http://localhost:$PORTSHARE

smtp:
    host: smtp.${CLOUDNAME}.mydongle.cloud
    port: 465
    username: ${EMAIL}
    password: ${SMTPPASSWD}
    email: ${EMAIL}
    sender-name: ${CLOUDNAME}
    encryption: ssl

EOF

#    accounts: https://enteaccounts.${PRIMARY}
#    auth: https://enteauth.${PRIMARY}
#    cast: https://entecast.${PRIMARY}
#    embed: https://enteembed.${PRIMARY}
#    ensu: https://enteensu.${PRIMARY}
#    photos: https://entephotos.${PRIMARY}
#    share: https://enteshare.${PRIMARY}

/usr/local/modules/ente/server/keys >> /disk/admin/modules/ente/museum.yaml

echo "{\"dbname\":\"entedb\", \"dbuser\":\"enteuser\", \"dbpass\":\"${DBPASSP}\"}" > /disk/admin/modules/_config_/ente.json
chown admin:admin /disk/admin/modules/_config_/piped.json

systemctl start ente.service
systemctl enable ente.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
