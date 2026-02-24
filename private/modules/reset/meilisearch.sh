#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset meilisearch##################"
PASSWORD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

systemctl stop meilisearch.service
rm -rf /disk/admin/modules/meilisearch
mkdir /disk/admin/modules/meilisearch
echo "MEILI_HOST=127.0.0.1\nMEILI_MASTER_KEY=$PASSWORD" > /disk/admin/modules/meilisearch/meilisearch.env
echo "{\"key\":\"${PASSWORD}\"}" > /disk/admin/modules/_config_/meilisearch.json
systemctl start meilisearch.service
systemctl enable meilisearch.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
