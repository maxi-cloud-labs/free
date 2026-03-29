#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset promptfoo##################"
systemctl stop promptfoo.service
rm -rf /disk/admin/modules/promptfoo
mkdir /disk/admin/modules/promptfoo
systemctl start promptfoo.service
systemctl enable promptfoo.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
