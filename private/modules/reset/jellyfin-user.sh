#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Create user jellyfin##################"
PORT=8096
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for jellyfin" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout api waiting for jellyfin" && exit
	response=`curl -sS -X POST "$URL/Startup/Configuration" -H "Content-Type: application/json" -d '{"UICulture":"en-US", "MetadataCountryCode":"US", "PreferredMetadataLanguage":"en"}'`
	if [ $? = 0 ]; then
		echo $response | grep -q -e "Please wait." -e "Please try again shortly."
		if [ $? = 1 ]; then
			break
		fi
	fi
done
echo "Doing jellyfin user"

CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

response=`curl -sS -X POST "$URL/Startup/Configuration" -H "Content-Type: application/json" -d '{"UICulture":"en-US", "MetadataCountryCode":"US", "PreferredMetadataLanguage":"en"}'`
response=`curl -sS -X GET "$URL/Startup/FirstUser"`
data="{ \"Name\":\"${CLOUDNAME}\", \"Password\": \"${PASSWD}\" }"
response=`curl -sS -X POST $URL/Startup/User -H "Content-Type: application/json" -d "$data"`
response=`curl -sS -X POST "$URL/Startup/Complete"`

data="{ \"Username\":\"${CLOUDNAME}\", \"Pw\": \"${PASSWD}\" }"
response=`curl -sS -X POST "$URL/Users/AuthenticateByName" -H "Content-Type: application/json" -H 'X-Emby-Authorization: MediaBrowser Client="AutomatedScript", Device="Linux", DeviceId="12345", Version="1.0.0"' -d "$data"`
token=`echo $response | jq -r ".AccessToken"`
#echo "token: $token"

curl -sS -X POST "$URL/Auth/Keys?App=ApiKey" -H "X-Emby-Token:$token" -H "Content-Type: application/json"
response=`curl -sS -X GET "$URL/Auth/Keys" -H "X-Emby-Token:$token"`
#echo $reponse
APIKEY=`echo $response | jq -r ".Items[0].AccessToken"`

echo "{\"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"apikey\":\"${APIKEY}\"}" > /disk/admin/modules/_config_/jellyfin.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
