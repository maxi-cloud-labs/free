#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset postfix##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
echo "${CLOUDNAME}.mydongle.cloud" > /etc/mailname
echo "127.0.0.1	smtp.${CLOUDNAME}.mydongle.cloud" >> /etc/hosts
sed -i -e "s|^myhostname =.*|myhostname = smtp.${CLOUDNAME}.mydongle.cloud|" /etc/postfix/main.cf

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
