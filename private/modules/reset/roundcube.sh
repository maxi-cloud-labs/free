#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset roundcube##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
SHORTNAME=$(jq -r ".info.shortname" /disk/admin/modules/_config_/_cloud_.json)
DOMAIN=$(jq -r ".info.domain" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.mydongle.cloud"
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
PWD=`doveadm pw -s SHA512-CRYPT -p "${PASSWD}"`


sed -e "s|^\$config\\['smtp_host'\\].*|\$config['smtp_host'] = 'ssl://localhost:465'; \$config['smtp_conn_options'] = [ 'ssl' => [ 'verify_peer' => false, 'verify_peer_name' => false ] ];|" /etc/roundcube/config.inc.php.template > /etc/roundcube/config.inc.php
rm -rf /disk/admin/modules/mail
mkdir -p /disk/admin/modules/mail/${CLOUDNAME}.mydongle.cloud/admin
echo "${EMAIL} ${CLOUDNAME}.mydongle.cloud/admin/" > /disk/admin/modules/mail/virtualmaps
postmap /disk/admin/modules/mail/virtualmaps
echo "root@${CLOUDNAME}.mydongle.cloud	admin@${CLOUDNAME}.mydongle.cloud" > /disk/admin/modules/mail/virtualalias
postmap /disk/admin/modules/mail/virtualalias
cat > /disk/admin/modules/mail/virtualhosts <<EOF
${CLOUDNAME}.mydongle.cloud
$SHORTNAME.myd.cd
$DOMAIN
EOF
TOKEN=$(jq -r ".postfix.token" /disk/admin/modules/_config_/_cloud_.json)
echo "[server.mydongle.cloud]:466 ${EMAIL}:${TOKEN}" > /disk/admin/modules/mail/relay
postmap /disk/admin/modules/mail/relay
echo "${EMAIL}:$PWD" > /disk/admin/modules/mail/password-${CLOUDNAME}.mydongle.cloud
echo "{\"email\":\"${EMAIL}\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/roundcube.json
ln -sf roundcube.json /disk/admin/modules/_config_/postfix.json
systemctl restart postfix.service
systemctl restart dovecot.service

echo "{ \"a\":\"status\", \"module\":\"$(basename \""$0"\" .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
