#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset zeroclaw##################"
systemctl stop zeroclaw.service
rm -rf /disk/admin/modules/zeroclaw
mkdir -p /disk/admin/modules/zeroclaw/workspace
cat > /disk/admin/modules/zeroclaw/config.toml << EOF
EOF
systemctl start zeroclaw.service
systemctl enable zeroclaw.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
