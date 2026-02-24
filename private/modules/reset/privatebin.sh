#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset privatebin##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
rm -rf /disk/admin/modules/privatebin
mkdir -p /disk/admin/modules/privatebin/data
cp /usr/local/modules/privatebin/cfg/conf.sample.php /disk/admin/modules/privatebin/conf.php
sed -i -e "s@^; name = \"PrivateBin\"@name = \"PrivateBin of ${CLOUDNAME}\"@" /disk/admin/modules/privatebin/conf.php
sed -i -e 's@^languageselection = false@languageselection = true@' /disk/admin/modules/privatebin/conf.php
sed -i -e 's@^dir = PATH "data"@dir = /disk/admin/modules/privatebin/data@' /disk/admin/modules/privatebin/conf.php
sed -i -e 's@^; urlshortener = "https://shortener.example.com/api?link="@urlshortener = "?shortenviayourls\&link="@' /disk/admin/modules/privatebin/conf.php
sed -i -e 's@^;\[yourls\]@\[yourls\]@' /disk/admin/modules/privatebin/conf.php
YOURLS_SIGNATURE=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 10)
sed -i -e "s@^; signature = \"\"@signature = \"${YOURLS_SIGNATURE}\"@" /disk/admin/modules/privatebin/conf.php
YOURLS_PORT=`jq -r .yourls.localPort /usr/local/modules/_core_/web/assets/modulesdefault.json`
sed -i -e "s@^; apiurl = \"https://yourls.example.com/yourls-api.php\"@apiurl = \"http://localhost:${YOURLS_PORT}/yourls-api.php\"@" /disk/admin/modules/privatebin/conf.php
chown -R admin:admin /disk/admin/modules/privatebin
chown -R www-data:admin /disk/admin/modules/privatebin/data

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
