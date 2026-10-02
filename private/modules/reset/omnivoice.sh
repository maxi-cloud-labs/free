#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset omnivoice##################"
systemctl stop omnivoice.service
rm -rf /disk/admin/modules/omnivoice
mkdir /disk/admin/modules/omnivoice

systemctl start omnivoice.service
systemctl enable omnivoice.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
