#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset triliumnotes##################"
systemctl stop triliumnotes.service
rm -rf /disk/admin/modules/triliumnotes
mkdir /disk/admin/modules/triliumnotes
cat > /disk/admin/modules/triliumnotes/config.ini << EOF
[General]
instanceName=
noAuthentication=false
noBackup=false

[Network]
host=127.0.0.1
port=8090
https=false
certPath=
keyPath=
trustedReverseProxy=false

[Session]
cookieMaxAge=1814400

[Sync]

[MultiFactorAuthentication]
oauthBaseUrl=
oauthClientId=
oauthClientSecret=
oauthIssuerBaseUrl=
oauthIssuerName=
oauthIssuerIcon=
EOF
systemctl start triliumnotes.service
systemctl enable triliumnotes.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/triliumnotes-user.sh &
else
	/usr/local/modules/_core_/reset/triliumnotes-user.sh
fi
