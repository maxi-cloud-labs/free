#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset ollama##################"
systemctl stop ollama.service
systemctl start ollama.service
systemctl enable ollama.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
