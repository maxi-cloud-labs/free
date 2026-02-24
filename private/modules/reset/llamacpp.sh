#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
#	exit 0
fi

echo "#Reset llamacpp##################"
systemctl stop llamacpp.service
systemctl start llamacpp.service
systemctl enable llamacpp.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
