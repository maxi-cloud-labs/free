#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset typesense##################"
SALT=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop typesense-server.service
rm -rf /disk/admin/modules/typesense
mkdir -p /disk/admin/modules/typesense/data
cat > /disk/admin/modules/typesense/typesense-server.ini << EOF
[server]
api-address = 127.0.0.1
api-port = 8108
data-dir = /disk/admin/modules/typesense/data
api-key = ${SALT}
log-dir = /var/log/typesense
enable-cors = true
# cors-domains = https://yourdomain.com,https://anotherdomain.com
EOF
echo "{ \"apikey\":\"${SALT}\" }" > /disk/admin/modules/_config_/typesense.json

mkdir /disk/admin/modules/typesensedashboard
cat > /disk/admin/modules/typesensedashboard/config.json << EOF
{
	"apiKey": "${SALT}",
	"node": {
		"host": "SAME",
		"path": "/api"
	}
}
EOF
systemctl start typesense-server.service
systemctl enable typesense-server.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
