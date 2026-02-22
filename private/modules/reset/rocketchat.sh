#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset rocketchat##################"
systemctl stop rocketchat.service
rm -rf /disk/admin/modules/rocketchat
mkdir /disk/admin/modules/rocketchat
systemctl start rocketchat.service
systemctl enable rocketchat.service

echo "{ \"a\":\"status\", \"module\":\"$(basename \""$0"\" .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
