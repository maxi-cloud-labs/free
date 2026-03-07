#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset lidarr##################"
APIKEY=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop lidarr.service
rm -rf /disk/admin/modules/lidarr
mkdir -p /disk/admin/modules/lidarr/downloads
cat > /disk/admin/modules/lidarr/config.xml << EOF
<Config>
	<BindAddress>127.0.0.1</BindAddress>
	<Port>8686</Port>
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
	<InstanceName>Lidarr</InstanceName>
</Config>
EOF
echo "{\"apikey\":\"${APIKEY}\"}" > /disk/admin/modules/_config_/lidarr.json
systemctl start lidarr.service
systemctl enable lidarr.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/lidarr-user.sh &
else
	/usr/local/modules/_core_/reset/lidarr-user.sh
fi
