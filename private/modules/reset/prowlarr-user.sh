#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Create prowlarr settings##################"
PORT=9696
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for prowlarr" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout api waiting for prowlarr" && exit
	STATUS=`curl -s -o /dev/null -w "%{http_code}" "$URL"`
	if [ $STATUS = 200 ]; then
		break
	fi
done
echo "Doing prowlarr settings"

PASSWD=`jq -r .password /disk/admin/modules/_config_/qbittorrent.json`
APIKEY=`jq -r .apikey /disk/admin/modules/_config_/prowlarr.json`
DATA="{ \"name\": \"qBittorrent\", \"enable\": true, \"implementation\": \"QBittorrent\", \"implementationName\": \"qBittorrent\", \"configContract\": \"QBittorrentSettings\", \"protocol\": \"torrent\", \"priority\": 25, \"tags\": [], \"presets\": [], \"categories\": [], \"fields\": [ { \"name\": \"host\", \"value\": \"localhost\" }, { \"name\": \"port\", \"value\": 8109 }, { \"name\": \"useSsl\", \"value\": false }, { \"name\": \"username\", \"value\": \"admin\" }, { \"name\": \"password\", \"value\": \"${PASSWD}\" }, { \"name\": \"category\", \"value\": \"prowlarr\" }, { \"name\": \"initialState\", \"value\": 2 }, { \"name\": \"sequentialOrder\", \"value\": false }, { \"name\": \"firstAndLast\", \"value\": false }, { \"name\": \"contentLayout\", \"value\": 0 } ]}"
response=`curl -sS -X POST "$URL/api/v1/downloadclient" -H "X-Api-Key: $APIKEY" -H "Content-Type: application/json" -d "$DATA"`
#echo $response

addApp() {
	AK=`jq -r .apikey /disk/admin/modules/_config_/$(echo "$1" | tr '[:upper:]' '[:lower:]').json`
	DATA="{ \"name\":\"$1\", \"implementation\":\"$1\", \"configContract\":\"${1}Settings\", \"fields\":[ { \"name\":\"baseUrl\", \"value\":\"http://localhost:$2\" }, { \"name\":\"apiKey\", \"value\":\"$AK\" }, { \"name\":\"syncLevel\", \"value\":\"fullSync\" } ], \"syncLevel\":\"fullSync\", \"enabled\":true }"
	response=`curl -sS -X POST "$URL/api/v1/applications" -H "X-Api-Key: $APIKEY" -H "Content-Type: application/json" -d "$DATA"`
#	echo $response
}
addApp "Lidarr" 8686
addApp "Radarr" 7878
addApp "Sonarr" 8989
addApp "Whisparr" 6969

DATA="{ \"name\": \"YTS\", \"enable\": true, \"protocol\": \"torrent\", \"priority\": 25, \"appProfileId\": 1, \"fields\": [ { \"name\": \"definitionFile\", \"value\": \"yts\" } ], \"implementationName\": \"Cardigann\", \"implementation\": \"Cardigann\", \"configContract\": \"CardigannSettings\", \"tags\": [] }"
response=`curl -sS -X POST "$URL/api/v1/indexer" -H "X-Api-Key: $APIKEY" -H "Content-Type: application/json" -d "$DATA"`
#echo $response

DATA="{ \"name\": \"EZTV\", \"enable\": true, \"protocol\": \"torrent\", \"priority\": 25, \"appProfileId\": 1, \"fields\": [ { \"name\": \"definitionFile\", \"value\": \"eztv\" } ], \"implementationName\": \"Cardigann\", \"implementation\": \"Cardigann\", \"configContract\": \"CardigannSettings\", \"tags\": [] }"
response=`curl -sS -X POST "$URL/api/v1/indexer" -H "X-Api-Key: $APIKEY" -H "Content-Type: application/json" -d "$DATA"`
#echo $response

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
