#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Create user minio##################"
read -r MINIOACCESS MINIOSECRET << EOF
	$(jq -r ".accessKey,.secretKey" /disk/admin/modules/_config_/minio.json | xargs)
EOF
PORT=9000
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for minio" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
echo "Doing minio user"
mc alias set local ${URL} ${MINIOACCESS} ${MINIOSECRET}

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
