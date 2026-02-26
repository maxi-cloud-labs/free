#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Create user newapi##################"
PORT=8118
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for newapi" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
echo "Doing newapi user"

PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

data="{\"password\":\"${PASSWD}\",\"confirmPassword\":\"${PASSWD}\",\"username\":\"admin\",\"SelfUseModeEnabled\":false,\"DemoSiteEnabled\":false}"
response=`curl -sS -X POST $URL/api/setup -H "Content-Type: application/json" -d "$data"`

echo "{\"username\":\"admin\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/newapi.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
