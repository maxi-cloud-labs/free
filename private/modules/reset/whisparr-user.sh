#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Create whisparr settings##################"
PORT=6969
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for whisparr" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout api waiting for whisparr" && exit
	STATUS=`curl -s -o /dev/null -w "%{http_code}" "$URL"`
	if [ $STATUS = 200 ]; then
		break
	fi
done
echo "Doing whisparr settings"

PASSWD=`jq -r .password /disk/admin/modules/_config_/qbittorrent.json`
APIKEY=`jq -r .apikey /disk/admin/modules/_config_/whisparr.json`
DATA="{ \"name\":\"qBittorrent\", \"implementation\":\"QBittorrent\", \"configContract\":\"QBittorrentSettings\", \"protocol\":\"torrent\", \"enable\":true, \"priority\":25, \"tags\":[], \"fields\":[ { \"name\":\"host\", \"value\":\"localhost\"}, { \"name\":\"port\", \"value\":8109 }, { \"name\":\"username\", \"value\":\"admin\" }, { \"name\":\"password\", \"value\":\"${PASSWD}\" }, { \"name\": \"initialState\", \"value\": 2 } ], \"enable\":true }"
response=`curl -sS -X POST "$URL/api/v3/downloadclient" -H "X-Api-Key: $APIKEY" -H "Content-Type: application/json" -d "$DATA"`
#echo $response

DATA="{\"path\":\"/disk/admin/modules/whisparr/downloads\"}"
response=`curl -sS -X POST "$URL/api/v3/rootfolder" -H "X-Api-Key: $APIKEY" -H "Content-Type: application/json" -d "$DATA"`
#echo $response

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
