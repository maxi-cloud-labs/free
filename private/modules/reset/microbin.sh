#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset microbin##################"
systemctl stop microbin.service
rm -rf /disk/admin/modules/microbin
mkdir /disk/admin/modules/microbin
cp /usr/local/modules/microbin/.env /disk/admin/modules/microbin/
sed -i -e 's@export MICROBIN_PORT=8080@export MICROBIN_PORT=8106@' /disk/admin/modules/microbin/.env
sed -i -e 's@export MICROBIN_BIND="0.0.0.0"@export MICROBIN_BIND="127.0.0.1"@' /disk/admin/modules/microbin/.env
sed -i -e 's@export MICROBIN_DATA_DIR="microbin_data"@export MICROBIN_DATA_DIR="/disk/admin/modules/microbin"@' /disk/admin/modules/microbin/.env
systemctl start microbin.service
systemctl enable microbin.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
