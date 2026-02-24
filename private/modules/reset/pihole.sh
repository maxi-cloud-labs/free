#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset pihole##################"
systemctl stop pihole-FTL.service
cp /usr/local/modules/pihole/pihole.toml /etc/pihole/pihole.toml
systemctl start pihole-FTL.service
systemctl enable pihole-FTL.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
