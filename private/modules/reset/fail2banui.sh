#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset fail2banui##################"
systemctl stop fail2banui.service
rm -rf /disk/admin/modules/fail2banui
mkdir /disk/admin/modules/fail2banui
systemctl start fail2banui.service
systemctl enable fail2banui.service

PORT=8118
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for fail2banui" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
sqlite3 /disk/admin/modules/fail2banui/fail2ban-ui.db "UPDATE servers SET is_default = 1, enabled = 1, updated_at = datetime('now') WHERE id = 'local';"
systemctl restart fail2banui.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
