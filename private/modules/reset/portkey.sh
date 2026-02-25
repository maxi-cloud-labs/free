#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset portkey##################"
systemctl stop portkey.service
rm -rf /disk/admin/modules/portkey
mkdir /disk/admin/modules/portkey
systemctl start portkey.service
systemctl enable portkey.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
