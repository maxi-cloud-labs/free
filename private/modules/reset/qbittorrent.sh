#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset qbittorrent##################"
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
HASH=`python3 -c "import hashlib, os, base64; s=os.urandom(16); p=\"${PASSWD}\"; dk=hashlib.pbkdf2_hmac(\"sha512\", p.encode(), s, 100000); print(f\"@ByteArray({base64.b64encode(s).decode()}:{base64.b64encode(dk).decode()})\")"`

systemctl stop qbittorrent.service
rm -rf /disk/admin/modules/qbittorrent
mkdir -p /disk/admin/modules/qbittorrent/qBittorrent/config/
mkdir -p /disk/admin/modules/qbittorrent/qBittorrent/downloads/
cat > /disk/admin/modules/qbittorrent/qBittorrent/config/qBittorrent.conf << EOF
[BitTorrent]
Session\Port=8796
Session\Interface=wlan0
Session\InterfaceAddress=0.0.0.0
Session\QueueingSystemEnabled=false
Session\SSL\Port=51037

[Preferences]
WebUI\HostHeaderValidation=false
WebUI\Port=8109
WebUI\CSRFProtection=false
WebUI\Address=127.0.0.1
WebUI\Password_PBKDF2="${HASH}"
EOF
echo "{\"username\":\"admin\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/qbittorrent.json
systemctl start qbittorrent.service
systemctl enable qbittorrent.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
