#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset jellyfin##################"
systemctl stop jellyfin.service
rm -rf /disk/admin/modules/jellyfin
mkdir /disk/admin/modules/jellyfin
cp -a /etc/jellyfin.bak /disk/admin/modules/jellyfin/config
cp -a /var/lib/jellyfin.bak /disk/admin/modules/jellyfin/data
chown -R admin:admin /disk/admin/modules/jellyfin/
chown -R jellyfin:jellyfin /disk/admin/modules/jellyfin/config/
chown -R jellyfin:jellyfin /disk/admin/modules/jellyfin/data/
systemctl start jellyfin.service
systemctl enable jellyfin.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/jellyfin-user.sh &
else
	/usr/local/modules/_core_/reset/jellyfin-user.sh
fi
