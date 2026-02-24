#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
#	exit 0
fi

echo "#Create user triliumnotes##################"
PORT=8090
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for triliumnotes" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
echo "Doing triliumnotes user"

PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
curl -sS -X POST "$URL/api/setup/new-document" -H "Content-Type: application/x-www-form-urlencoded" --data-urlencode "initialized=true"
curl -sS -X POST "$URL/set-password" --data-urlencode "password1=$PASSWD" --data-urlencode "password2=$PASSWD"

echo "{\"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/triliumnotes.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
