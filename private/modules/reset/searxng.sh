#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset searxng##################"
#PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
SECRETKEY=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop searxng.service
rm -rf /disk/admin/modules/searxng
mkdir /disk/admin/modules/searxng
cp /usr/local/modules/searxng/utils/templates/etc/searxng/settings.yml /disk/admin/modules/searxng/
sed -i -e "s/^  secret_key:.*/  secret_key: \"${SECRETKEY}\"\n  bind_address: "127.0.0.1"\n  port: 8111/" /disk/admin/modules/searxng/settings.yml
#sed -i -e "s@^  # base_url:.*@  base_url: https://search.${PRIMARY}@" /disk/admin/modules/searxng/
systemctl start searxng.service
systemctl enable searxng.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
