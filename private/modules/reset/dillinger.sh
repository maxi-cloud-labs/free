#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset dillinger##################"
systemctl stop dillinger.service
rm -rf /disk/admin/modules/dillinger
mkdir /disk/admin/modules/dillinger
systemctl start dillinger.service
systemctl enable dillinger.service

echo "{ \"a\":\"status\", \"module\":\"$(basename \""$0"\" .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
