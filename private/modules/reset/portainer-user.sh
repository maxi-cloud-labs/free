#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Create user portainer##################"
PORT=8115
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for portainer" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout api waiting for portainer" && exit
	STATUS=`curl -s -o /dev/null -w "%{http_code}" "$URL/api/system/status"`
	if [ $STATUS = 200 ]; then
		break
	fi
done
echo "Doing portainer user"

CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
data="{\"Username\":\"${CLOUDNAME}\", \"Password\":\"${PASSWD}\"}"
response=`curl -sS -X POST "${URL}/api/users/admin/init" -H "Content-Type: application/json" -d "$data"`
#echo $reponse

echo "{\"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/portainer.json

echo "{ \"a\":\"status\", \"module\":\"$(basename \""$0"\" .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
