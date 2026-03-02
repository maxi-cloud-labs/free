#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset rediscommander##################"
systemctl stop rediscommander.service
rm -rf /disk/admin/modules/rediscommander
mkdir /disk/admin/modules/rediscommander
systemctl start rediscommander.service
systemctl enable rediscommander.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
