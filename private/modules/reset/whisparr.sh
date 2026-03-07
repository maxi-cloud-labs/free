#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset whisparr##################"
APIKEY=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop whisparr.service
rm -rf /disk/admin/modules/whisparr
mkdir -p /disk/admin/modules/whisparr/downloads
cat > /disk/admin/modules/whisparr/config.xml << EOF
<Config>
	<BindAddress>127.0.0.1</BindAddress>
	<Port>6969</Port>
	<SslPort>9898</SslPort>
	<EnableSsl>False</EnableSsl>
	<LaunchBrowser>True</LaunchBrowser>
	<ApiKey>${APIKEY}</ApiKey>
	<AuthenticationMethod>External</AuthenticationMethod>
	<AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>
	<Branch>master</Branch>
	<LogLevel>debug</LogLevel>
	<SslCertPath></SslCertPath>
	<SslCertPassword></SslCertPassword>
	<UrlBase></UrlBase>
	<InstanceName>Whisparr</InstanceName>
</Config>
EOF
echo "{\"apikey\":\"${APIKEY}\"}" > /disk/admin/modules/_config_/whisparr.json
systemctl start whisparr.service
systemctl enable whisparr.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/whisparr-user.sh &
else
	/usr/local/modules/_core_/reset/whisparr-user.sh
fi
