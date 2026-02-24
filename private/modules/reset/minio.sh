#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset minio##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PASSWORD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

systemctl stop minio.service
rm -rf /disk/admin/modules/minio
mkdir /disk/admin/modules/minio
cat > /disk/admin/modules/minio/minio.env << EOF
MINIO_ROOT_USER=${CLOUDNAME}
MINIO_ROOT_PASSWORD=${PASSWORD}
EOF

echo "{\"accessKey\":\"${CLOUDNAME}\", \"secretKey\":\"${PASSWORD}\"}" > /disk/admin/modules/_config_/minio.json

systemctl start minio.service
systemctl enable minio.service

/usr/local/modules/_core_/reset/minio-user.sh &
