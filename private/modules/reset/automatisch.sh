#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset automatisch##################"
systemctl stop automatisch.service
rm -rf /disk/admin/modules/automatisch
mkdir /disk/admin/modules/automatisch
#systemctl start automatisch.service
#systemctl enable automatisch.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
