#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset silverbullet##################"
systemctl stop silverbullet.service
rm -rf /disk/admin/modules/silverbullet
mkdir /disk/admin/modules/silverbullet
systemctl start silverbullet.service
systemctl enable silverbullet.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
