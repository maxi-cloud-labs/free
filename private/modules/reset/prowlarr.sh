#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset prowlarr##################"
APIKEY=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop prowlarr.service
rm -rf /disk/admin/modules/prowlarr
mkdir -p /disk/admin/modules/prowlarr/downloads
cat > /disk/admin/modules/prowlarr/config.xml << EOF
<Config>
	<BindAddress>127.0.0.1</BindAddress>
	<Port>9696</Port>
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
	<InstanceName>Prowlarr</InstanceName>
</Config>
EOF
echo "{\"apikey\":\"${APIKEY}\"}" > /disk/admin/modules/_config_/prowlarr.json
systemctl start prowlarr.service
systemctl enable prowlarr.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/prowlarr-user.sh &
else
	/usr/local/modules/_core_/reset/prowlarr-user.sh
fi
