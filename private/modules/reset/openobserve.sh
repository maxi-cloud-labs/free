#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset openobserve##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.mydongle.cloud"
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
systemctl stop openobserve.service
rm -rf /disk/admin/modules/openobserve
mkdir -p /disk/admin/modules/openobserve/data
cat > /disk/admin/modules/openobserve/env << EOF
ZO_ROOT_USER_EMAIL=${EMAIL}
ZO_ROOT_USER_PASSWORD=${PASSWD}
EOF
systemctl start openobserve.service
systemctl enable openobserve.service

echo "{\"email\":\"${EMAIL}\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/openobserve.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
