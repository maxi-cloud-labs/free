#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset openfang##################"
systemctl stop openfang.service
rm -rf /disk/admin/modules/openfang
mkdir /disk/admin/modules/openfang
cd /disk/admin/modules/openfang
openfang init
systemctl start openfang.service
systemctl enable openfang.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
