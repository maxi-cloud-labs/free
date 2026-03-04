#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Create user ente##################"
PORT=3200
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for ente" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
echo "Doing ente user"

CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.mydongle.cloud"
PASSWD=$1

data="{ \"email\": \"${EMAIL}\", \"password\": \"${PASSWD}\", \"confirmPassword\": \"${PASSWD}\", \"purpose\": \"signup\" }"
response=`curl -sS -X POST ${URL}/users/ott -H "Content-Type: application/json" -d "$data"`

data="{ \"email\": \"${EMAIL}\", \"ott\": \"123456\" }"
#response=`curl -sS -X POST ${URL}/users/verify-email -H "Content-Type: application/json" -d "$data"`

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
