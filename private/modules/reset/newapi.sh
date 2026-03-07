#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset newapi##################"
systemctl stop newapi.service
rm -rf /disk/admin/modules/newapi
mkdir /disk/admin/modules/newapi
systemctl start newapi.service
systemctl enable newapi.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/newapi-user.sh &
else
	/usr/local/modules/_core_/reset/newapi-user.sh
fi
