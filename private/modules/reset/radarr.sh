#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset radarr##################"
APIKEY=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
systemctl stop radarr.service
rm -rf /disk/admin/modules/radarr
mkdir -p /disk/admin/modules/radarr/downloads
cat > /disk/admin/modules/radarr/config.xml << EOF
<Config>
	<BindAddress>127.0.0.1</BindAddress>
	<Port>7878</Port>
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
	<InstanceName>Radarr</InstanceName>
</Config>
EOF
echo "{\"apikey\":\"${APIKEY}\"}" > /disk/admin/modules/_config_/radarr.json
systemctl start radarr.service
systemctl enable radarr.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/radarr-user.sh &
else
	/usr/local/modules/_core_/reset/radarr-user.sh
fi
