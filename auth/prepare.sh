#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for run [-c -d -h -i]"
echo "c:	Clean on PC"
echo "d:	Light clean on PC"
echo "h:	Print this usage and exit"
echo "i:	Install during install"
exit 0
}

CLEAN=0
INSTALL=0
while getopts cdhi opt; do
	case "$opt" in
		c) CLEAN=1;;
		d) CLEAN=2;;
		h) helper;;
		i) INSTALL=1;;
	esac
done

cd `dirname $0`
if [ $INSTALL = 1 ]; then
	#During install only
	echo "{}" > /disk/admin/modules/_config_/_cloud_.json
	echo "{}" > /disk/admin/modules/_config_/_modules_.json
	rm -rf betterauth /disk/admin/modules/betterauth
	mkdir /disk/admin/modules/betterauth/
	npm install
	sed -i -e 's/PRODUCTION=false/PRODUCTION=true/' .env
	npx @better-auth/cli migrate -y
	rm -f /disk/admin/modules/betterauth/secret.txt
	chown -R admin:admin /disk/admin/modules/betterauth
	npm run build
	rm -rf /usr/local/modules/betterauth
	cp -a betterauth /usr/local/modules
	cp -a node_modules /usr/local/modules/betterauth
elif [ $CLEAN = 1 ]; then
	#On PC only
	echo "{}" > ../rootfs/disk/admin/modules/_config_/_cloud_.json
	echo "{}" > ../rootfs/disk/admin/modules/_config_/_modules_.json
	rm -rf node_modules betterauth ../rootfs/disk/admin/modules/betterauth
elif [ $CLEAN = 2 ]; then
	#On PC only
	echo "{}" > ../rootfs/disk/admin/modules/_config_/_cloud_.json
	echo "{}" > ../rootfs/disk/admin/modules/_config_/_modules_.json
	rm -rf betterauth ../rootfs/disk/admin/modules/betterauth
	./prepare.sh
else
	#On PC only
	if [ ! -d node_modules ]; then
		npm install
	fi
	if [ ! -d ../rootfs/disk/admin/modules/betterauth/ ]; then
		DATA=$(cat << EOF
{
	"ai": {
		"keys": {
			"_server_": "fake_key"
		},
		"routingModules": {
			"_all_": "_server_"
		},
		"routingPerModule": false
	},
	"hardware": {
		"disk": "/dev/nvme0n1p2",
		"dongle": {
			"noBuzzer": 0,
			"rotation": 0,
			"sleepKeepLed": 0
		},
		"internalIP": "",
		"externalIP": "",
		"mem": "31",
		"model": "PC",
		"serial": "1234567890abcdef",
		"timezone": "America/Los_Angeles"
	},
	"info": {
		"domain": "",
		"language": "en",
		"name": "johndoe",
		"primary": "johndoe.maxi.cloud",
		"setup": "done2",
		"shortname": "jd"
	},
	"security": {
		"adminSudo": true,
		"autoLogin": true,
		"includeTorrent": true,
		"grantLocalPermission": true,
		"newUserNeedsApproval": true,
		"signInNotification": false,
		"updateRemoteIP": true
	}
}
EOF
)
		echo $DATA | jq . > ../rootfs/disk/admin/modules/_config_/_cloud_.json
		mkdir -p ../rootfs/disk/admin/modules/betterauth
		npx @better-auth/cli migrate -y
		(sleep 3 && ./test.sh -c) &
	fi
	npm run dev
fi
