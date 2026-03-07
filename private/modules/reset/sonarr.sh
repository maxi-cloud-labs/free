#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset sonarr##################"
APIKEY=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop sonarr.service
rm -rf /disk/admin/modules/sonarr
mkdir -p /disk/admin/modules/sonarr/downloads
cat > /disk/admin/modules/sonarr/config.xml << EOF
<Config>
	<BindAddress>127.0.0.1</BindAddress>
	<Port>8989</Port>
	<SslPort>9898</SslPort>
	<EnableSsl>False</EnableSsl>
	<LaunchBrowser>True</LaunchBrowser>
	<ApiKey>${APIKEY}</ApiKey>
	<AuthenticationMethod>External</AuthenticationMethod>
	<AuthenticationRequired>DisabledForLocalAddresses</AuthenticationRequired>
	<Branch>main</Branch>
	<LogLevel>debug</LogLevel>
	<SslCertPath></SslCertPath>
	<SslCertPassword></SslCertPassword>
	<UrlBase></UrlBase>
	<InstanceName>Sonarr</InstanceName>
</Config>
EOF
echo "{\"apikey\":\"${APIKEY}\"}" > /disk/admin/modules/_config_/sonarr.json
systemctl start sonarr.service
systemctl enable sonarr.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/sonarr-user.sh &
else
	/usr/local/modules/_core_/reset/sonarr-user.sh
fi
