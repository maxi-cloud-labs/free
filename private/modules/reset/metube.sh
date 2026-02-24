#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset metube##################"
systemctl stop metube.service
rm -rf /disk/admin/modules/metube
mkdir /disk/admin/modules/metube
systemctl start metube.service
systemctl enable metube.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
