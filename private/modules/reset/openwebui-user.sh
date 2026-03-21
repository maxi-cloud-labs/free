#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Create user openwebui##################"
PORT=8101
AIKEY=$(jq -r ".ai.keys._server_" /disk/admin/modules/_config_/_cloud_.json)
URL="http://localhost:$PORT"
TIMEOUT=40
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for openwebui" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout api waiting for openwebui" && exit
	STATUS=`curl -s -o /dev/null -w "%{http_code}" "$URL/health"`
	if [ $STATUS = 200 ]; then
		break
	fi
done
echo "Doing openwebui user"

CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.maxi.cloud"
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

data="{ \"email\": \"${EMAIL}\", \"name\": \"${CLOUDNAME}\", \"password\": \"${PASSWD}\" }"
response=`curl -sS -X POST $URL/api/v1/auths/signup -H "Content-Type: application/json" -d "$data"`
token=`echo $response | jq -r ".token"`
#echo "token: $token"

data="{ \"ENABLE_OPENAI_API\":true, \"OPENAI_API_BASE_URLS\":[\"https://aiproxy.maxi.cloud/v1\"], \"OPENAI_API_KEYS\":[\"${AIKEY}\"], \"OPENAI_API_CONFIGS\":{ \"additionalProp1\": {} } }"
response=`curl -sS -X POST $URL/openai/config/update -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$data"`
#echo $response

echo "{\"name\":\"${CLOUDNAME}\", \"email\":\"${EMAIL}\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/openwebui.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
