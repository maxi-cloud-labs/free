#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset syncthing##################"
systemctl stop syncthing.service
rm -rf /disk/admin/modules/syncthing
mkdir /disk/admin/modules/syncthing
/usr/local/bin/syncthing --home=/disk/admin/modules/syncthing generate
sed -i -e "s@<urAccepted>0</urAccepted>@<urAccepted>-1</urAccepted>@" /disk/admin/modules/syncthing/config.xml
sed -i -e "s@<urSeen>0</urSeen>@<urSeen>3</urSeen>@" /disk/admin/modules/syncthing/config.xml
sed -i -e "/<unackedNotificationID>authenticationUserAndPassword<\\/unackedNotificationID>/d" /disk/admin/modules/syncthing/config.xml
sed -i -e "s@<autoUpgradeIntervalH>12</autoUpgradeIntervalH>@<autoUpgradeIntervalH>0</autoUpgradeIntervalH>@" /disk/admin/modules/syncthing/config.xml
systemctl start syncthing.service
systemctl enable syncthing.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
