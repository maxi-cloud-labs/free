#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset n8n##################"
systemctl stop n8n.service
rm -rf /disk/admin/modules/n8n
mkdir /disk/admin/modules/n8n
systemctl start n8n.service
systemctl enable n8n.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/n8n-user.sh &
else
	/usr/local/modules/_core_/reset/n8n-user.sh
fi
