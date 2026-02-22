#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for install [-c -h -p]"
echo "c:	Do full clone of all modules"
echo "h:	Print this usage and exit"
echo "p:	Do production image"
exit 0
}

PROD=0
CLONE=0
while getopts chp opt; do
	case "$opt" in
		c) CLONE=1;;
		h) helper;;
		p) PROD=1;;
	esac
done

installModule() {
	if [ -z $1 ]; then
		return
	fi
	LIST2=`jq -r '.default.setupDependencies | join(" ")' $PP/modules/$1.json 2> /dev/null`
	for tt in $LIST2; do
		installModule $tt
	done
	if [ ! -f /home/ai/build/_modulesInstalled/$1 -a -f $PP/modules/install/$1.sh ]; then
		echo "################################"
		echo "Module: $1"
		echo "################################"
		DATESTARTM=`date +%s`
		OS=$OS PP=$PP $PP/modules/install/$1.sh
		touch /home/ai/build/_modulesInstalled/$1
		DATEFINISHM=`date +%s`
		DELTAM=$((DATEFINISHM - DATESTARTM))
		echo "Done in $((DELTAM / 60))m $((DELTAM % 60))s"
	fi
}

if [ "m`id -u`" != "m0" ]; then
	echo "You need to be root"
	exit 0
fi

cd `dirname $0`
echo "Current directory is now `pwd`"
PP=`pwd`

#On PC
#tar -cjpf a.tbz2 app/ auth/ kernel/ rootfs/ screenAvr/ moduleApache2/ pam/ moduleIpApache2/ private/install.sh private/modules/ private/preseed*.cfg build/screen
#scp a.tbz2 build/img/clone.tbz2 ai@192.168.10.11:/tmp
#On device
#tar -xjpf /tmp/a.tbz2
lsb_release -a | grep trixie
if [ $? = 0 ]; then
	OS="pios"
fi
lsb_release -a | grep noble
if [ $? = 0 ]; then
	OS="ubuntu"
fi

echo "################################"
echo "Start install"
echo "################################"
date
DATESTART=`date +%s`

echo "################################"
echo "Initial"
echo "################################"
cd /home/ai
mkdir /home/ai/build
sed -i -e 's|/root|/home/ai|' /etc/passwd
rm -rf /root
sed -i -e 's|# "\\e\[5~": history-search-backward|"\\e\[5~": history-search-backward|' /etc/inputrc
sed -i -e 's|# "\\e\[6~": history-search-forward|"\\e\[6~": history-search-forward|' /etc/inputrc
sed -i -e 's|%sudo	ALL=(ALL:ALL) ALL|%sudo	ALL=(ALL:ALL) NOPASSWD:ALL|' /etc/sudoers
sed -i -e 's|HISTSIZE=.*|HISTSIZE=-1|' /home/ai/.bashrc
sed -i -e 's|HISTFILESIZE=.*|HISTFILESIZE=-1|' /home/ai/.bashrc
ln -sf /lib/systemd/system/serial-getty@.service /etc/systemd/system/getty.target.wants/serial-getty@ttyGS0.service
cat > /etc/fstab <<EOF
proc            /proc           proc    defaults          0       0
LABEL=rootfs  /               ext4    defaults,noatime  0       1
#LABEL=rootfs  /disk           ext4    defaults,noatime  0       1
EOF
fatlabel /dev/nvme0n1p1 bootfs
e2label /dev/nvme0n1p2 rootfs
mkdir /disk
adduser --comment Administrator --home /disk/admin --disabled-password admin
usermod -a -G adm,dialout,cdrom,audio,video,plugdev,games,users,input,render,netdev,spi,i2c,gpio,bluetooth admin
sed -i -e 's|# User privilege specification|# User privilege specification\nadmin ALL=(ALL:ALL) NOPASSWD: /sbin/shutdown -h now, /sbin/reboot, /usr/local/modules/_core_/reset.sh|' /etc/sudoers
usermod -a -G adm,dialout,cdrom,audio,video,plugdev,games,users,input,render,netdev,spi,i2c,gpio,bluetooth ai
usermod -a -G sudo ai
mkdir -p /usr/local/modules/_core_
mkdir -p /home/ai/build/_modulesInstalled
mkdir -p /disk/admin/modules/_config_

echo "################################"
echo "Fix locale"
echo "################################"
sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen
locale-gen

echo "################################"
echo "Upgrade"
echo "################################"
sed -i -e "s/Suites: trixie trixie-updates/Suites: trixie trixie-updates trixie-backports/" /etc/apt/sources.list.d/debian.sources
apt-get update
apt-get -y upgrade

echo "################################"
echo "Basic"
echo "################################"
if [ $OS = "ubuntu" ]; then
	chmod a-x /etc/update-motd.d/*
	which snapd
	if [ $? = 0 ]; then
		snap remove snapd
		apt-get -y purge snapd
	fi
	apt-get -y install bzip2 zip gpiod net-tools wireless-tools build-essential curl wget nano initramfs-tools device-tree-compiler
fi
apt-get -y install evtest qrencode dos2unix lrzsz libpam-oath oathtool cryptsetup-bin cmake lsof hdparm screen figlet toilet composer network-manager bind9 acl jq telnet netcat-openbsd pamtester expect rsyslog meson ninja-build
apt-get -y install liboath-dev libinput-dev libboost-dev libboost-system-dev libboost-thread-dev libboost-filesystem-dev libcurl4-openssl-dev libssl-dev libbluetooth-dev libturbojpeg0-dev libldap-dev libsasl2-dev apache2-dev libpam0g-dev libnm-dev libjwt-dev libsystemd-dev libdb-dev libsqlite3-dev
if [ $OS = "ubuntu" ]; then
	apt-get -y install libprotobuf32t64 libjpeg62-dev
elif [ $OS = "pios" ]; then
	apt-get -y install libprotobuf32 libjpeg62-turbo-dev
fi

echo "################################"
echo "python"
echo "################################"
apt-get -y install python3-venv python3-intelhex python3-certbot-apache python3-setuptools python3-attr python3-wheel python3-wheel-whl cython3 python3-dateutil python3-sniffio python3-astroid python3-tomlkit python3-isort python3-mccabe python3-platformdirs python3-serial python3-dill python3-dotenv python3-pytzdata

echo "################################"
echo "Early install"
echo "################################"
installModule mysql
installModule postfix
installModule python

echo "################################"
echo "Modules via apt"
echo "################################"
apt-get -y install certbot dovecot-imapd dovecot-pop3d ffmpeg fscrypt hugo imagemagick libapache2-mod-php libapache2-mod-authnz-external libpam-fscrypt mosquitto nginx pandoc php php-json php-mysql php-gd php-sqlite3 php-xml php-yaml php-curl php-zip php-apcu php-memcache php-redis php-ldap php-bcmath php-imagick php-mongodb php-pgsql procmail rspamd sqlite3
apt-get -y install ruby ruby-dev

echo "################################"
echo "devmem2"
echo "################################"
cd /home/ai/build
wget -nv https://bootlin.com/pub/mirror/devmem2.c
gcc -o /usr/local/bin/devmem2 devmem2.c

echo "################################"
echo "node"
echo "################################"
cd /home/ai/build
FILENODE=`wget -q -O - https://nodejs.org/dist/latest-v22.x/ | grep "\-linux\-arm64\.tar\.xz" | sed -E "s|.*>([^<]*)<.*|\1|"`
wget -nv https://nodejs.org/dist/latest-v22.x/$FILENODE
tar -xJpf node-v*
cp -a node-v*/bin/ node-v*/include/ node-v*/lib/ node-v*/share/ /usr/local
cd ..
npm -g install npm node-gyp pnpm yarn serve

echo "################################"
echo "npm Packages"
echo "################################"
npm -g install @angular/cli @ionic/cli @vue/cli cordova-res

echo "################################"
echo "pcpp"
echo "################################"
if [ $OS = "ubuntu" ]; then
	apt-get -y install python3-pcpp
	ln -sf pcpp-python /usr/bin/pcpp
elif [ $OS = "pios" ]; then
	cd /home/ai/build
	wget -nv https://files.pythonhosted.org/packages/41/07/876153f611f2c610bdb8f706a5ab560d888c938ea9ea65ed18c374a9014a/pcpp-1.30.tar.gz
	tar -xpf pcpp-1.30.tar.gz
	cd pcpp-1.30
	python3 setup.py install
fi

echo "################################"
echo "postfixparser"
echo "################################"
cd /home/ai/build
git clone https://github.com/Privex/python-loghelper
cd python-loghelper
python3 setup.py install
cd ..
git clone https://github.com/Privex/python-helpers
cd python-helpers
python3 setup.py install
cd ../..

echo "################################"
echo "cc2538-prog"
echo "################################"
cd /home/ai/build
git clone https://github.com/1248/cc2538-prog
cd cc2538-prog
make
cp cc2538-prog /usr/local/bin/
cd ../..

if [ -f "/tmp/clone.tbz2" ]; then
	echo "################################"
	echo "Extraction instead of cloning"
	echo "################################"
	tar -xjpf /tmp/clone.tbz2 -C /usr/local/modules
	sync
	rm -f /tmp/clone.tbz2
else
	clone() {
		PATHB=/usr/local/modules
		echo "################################"
		echo "$1"
		echo "################################"
		cd $PATHB
		git clone https://github.com/$2 $1
		cd $1
		git checkout $3
		rm -rf .git
		cd ..
	}

	clone 2fauth Bubka/2FAuth v5.6.1
	clone audiobookshelf advplyr/audiobookshelf v2.26.2
	clone awesomeselfhosted	awesome-selfhosted/awesome-selfhosted-html becfdb62
	clone automatisch automatisch/automatisch v0.15.0
	clone beautifierweb beautifier/beautifier.io a1fa4975
	clone bugzilla bugzilla/bugzilla release-5.3.3
	clone changedetection dgtlmoon/changedetection.io 0.50.7
	clone convertx C4illin/ConvertX v0.14.1
	clone cssunminifier mrcoles/cssunminifier c5cad8ab
	clone cyberchef gchq/CyberChef v10.19.4
	clone dillinger joemccann/dillinger 637ef3e7
	clone discourse discourse/discourse v3.4.6
	clone docsify docsifyjs/docsify v4.13.1
	clone docusaurus facebook/docusaurus v3.9.2
	clone droppy droppyjs/droppy v1.3.1
	clone erugo ErugoOSS/Erugo v0.2.0
	clone ente ente-io/ente v2.0.34
	clone excalidraw excalidraw/excalidraw v0.18.0
	clone fider getfider/fider v0.32.0
	clone filegator filegator/filegator v7.13.0
	clone flarum flarum/flarum v1.8.1
	clone freshrss FreshRSS/FreshRSS 1.26.3
	clone gitea go-gitea/gitea v1.24.3
	clone grav getgrav/grav 1.7.48
	clone hoodik hudikhq/hoodik v1.8.1
	clone html5qrcode mebjas/html5-qrcode v2.3.8
	clone immich immich-app/immich v1.135.3
	clone iopaint Sanster/IOPaint iopaint-1.5.3
	clone joomla joomla/joomla-cms 5.3.2
	clone joplin laurent22/joplin server-v3.4.1
	clone jstinker johncipponeri/jstinker master
	clone k3s k3s-io/k3s v1.35.0+k3s1
	clone karakeep karakeep-app/karakeep v0.26.0
	clone librechat danny-avila/LibreChat v0.7.9
	clone librephotos LibrePhotos/librephotos HEAD
	clone limesurvey LimeSurvey/LimeSurvey 6.15.3+250708
	clone lobechat lobehub/lobe-chat v1.143.0
	clone mantisbugtracker mantisbt/mantisbt release-2.27.1
	clone markdowneditor jbt/markdown-editor v2
	clone mastodon https://github.com/tootsuite/mastodon.git v4.5.4
	clone maybe maybe-finance/maybe v0.5.0
	clone mermaid mermaid-js/mermaid mermaid@11.9.0
	clone metube alexta69/metube HEAD
	clone minio minio/minio RELEASE.2025-07-18T21-56-31Z
	clone mkdocs mkdocs/mkdocs 1.6.1
	clone ollama ollama/ollama v0.9.7-rc1
	clone osticket osTicket/osTicket v1.18.2
	clone passbolt passbolt/passbolt_api v5.7.2
	clone photoprism photoprism/photoprism 250707-d28b3101e
	clone photoview photoview/photoview v2.4.0
	clone phpbb phpbb/phpbb release-3.3.15
	clone phpsandbox Corveda/PHPSandbox v3.1
	clone pihole pi-hole/pi-hole v6.3
	clone pingvinshare stonith404/pingvin-share v1.13.0
	clone piped TeamPiped/Piped 72c92b9
	clone piped/pipedbackend TeamPiped/Piped-Backend c5921f6b
	clone piped/pipedproxy TeamPiped/Piped-Proxy a973968
	clone prettier prettier/prettier 3.7.4
	clone privatebin PrivateBin/PrivateBin 2.0.3
	clone projectsend projectsend/projectsend r1720
	clone psitransfer psi-4ward/psitransfer v2.3.1
	clone qrcodegenerator bizzycola/qrcode-generator HEAD
	clone scrcpy Genymobile/scrcpy v3.3.4
	clone searxng searxng/searxng 74ec225a
	clone shafi dealfonso/shafi e55e339f
	clone sharry eikek/sharry v1.15.0
	clone shields badges/shields server-2025-12-06
	clone silverbullet silverbulletmd/silverbullet 2.3.0
	clone sqliteweb coleifer/sqlite-web 0.6.6
	clone stirlingpdf Stirling-Tools/Stirling-PDF v1.0.2
	clone stremio Stremio/stremio-web v5.0.0-beta.29
	clone studio outerbase/studio v0.10.2
	clone sunrisecms cityssm/sunrise-cms v1.0.0-alpha.19
	clone superset apache/superset 5.0.0
	clone syncthing syncthing/syncthing v1.30.0
	clone tabby TabbyML/tabby v0.31.2
	clone tabby/crates/llama-cpp-server/llama.cpp ggerganov/llama.cpp 16cc3c606efe1640a165f666df0e0dc7cc2ad869
	clone transform ritz078/transform e1294208
	clone pinchflat kieraneglin/pinchflat v2025.9.26
	clone tubesync meeb/tubesync v0.15.10
	clone typesensedashboard bfritscher/typesense-dashboard v2.4.4
	clone umtpresponder viveris/uMTP-Responder umtprd-1.6.8
	clone uptime louislam/uptime-kuma 1.23.16
	clone webssh2 billchurch/webssh2 webssh2-server-v2.3.4
	clone wgdashboard WGDashboard/WGDashboard v4.3.1
	clone webtrees fisharebest/webtrees 2.1.25
	clone yourls YOURLS/YOURLS 1.10.2
	clone zola getzola/zola v0.21.0
fi

echo "################################"
echo "Install via modules scripts"
echo "################################"
LIST=`find $PP/modules/ -name "*.json" -printf "%f\n" | sort`
COUNT=0
TOTAL=`echo "$LIST" | wc -l` 
for NAME in $LIST; do
	NAME="${NAME%?????}"
	COUNT=$((COUNT + 1))
	echo "$COUNT/$TOTAL"
	installModule $NAME
done

echo "################################"
echo "Services"
echo "################################"
cd /home/ai
cp -a $PP/modules/services/* /etc/systemd/system/

echo "################################"
echo "Rootfs"
echo "################################"
cd /home/ai
chown -R root:root rootfs
chown -R admin:admin rootfs/disk/admin
cp -a rootfs/* /
rm -rf rootfs
chown -R root:root /usr/local
chown -R ai:ai /home/ai
chown -R admin:www-data /usr/local/modules/libreqr/css
chown -R www-data:admin /disk/admin/modules/roundcube
chown -R www-data:admin /usr/local/modules/limesurvey/tmp
chown -R admin:www-data /usr/local/modules/2fauth/
chown -R admin:admin /usr/local/modules/lobechat/.next/cache /usr/local/modules/lobechat/.next/server
chown -R admin:admin /usr/local/modules/openwebui/lib/python3.11/site-packages/open_webui/static/
mv /var/lib/mysql /disk/admin/modules
chown mysql:mysql /disk/admin/modules/mysql
ln -sf /disk/admin/modules/mysql /var/lib/mysql
chown -R admin:admin /disk/admin/modules/metube
adduser admin www-data

echo "################################"
echo "Cleanup"
echo "################################"
if [ $OS = "pios" ]; then
	apt-get -y purge python3-rpi-lgpio rpicam-apps-core rpicam-apps-lite
fi
apt-get -y autoremove
rm -rf /lib/modules/6.12.47*
rm -f /etc/udev/rules.d/99-rpi-keyboard.rules
rm -f /etc/systemd/system/multi-user.target.wants/nginx.service
rm -f /etc/systemd/system/multi-user.target.wants/named.service
rm -f /etc/systemd/system/multi-user.target.wants/sshswitch.service
rm -rf /var/cache/apt/archives/*.deb /home/ai/build/*.deb /home/ai/build/*.xz /home/ai/build/*.gz /home/ai/.cache/*
rm -rf /root /lost+found /usr/local/games /opt/containerd /opt/pigpio
rm -rf /var/lib/bluetooth /var/lib/docker /var/lib/raspberrypi /var/lib/NetworkManager /var/cache-admin
mkdir /var/cache-admin /var/log/_core_ /var/log/zigbee2mqtt /var/log/triliumnotes
chown admin:admin /var/cache-admin /var/log/_core_ /var/log/zigbee2mqtt /var/log/triliumnotes /var/log/invidious
chmod 755 /var/log/apache2

echo "################################"
echo "Finish install"
echo "################################"
sync
sync
date
DATEFINISH=`date +%s`
DELTA=$((DATEFINISH - DATESTART))
echo "Duration: $((DELTA / 3600))h $(((DELTA % 3600) / 60))m $((DELTA % 60))s"

if [ $PROD = 1 ]; then
	journalctl --rotate
	journalctl --vacuum-time=1s
	sed -i -e 's|ai:[^:]*:|ai:*:|' /etc/shadow
	sed -i -e 's|ai:[^:]*:|ai:*:|' /etc/shadow-
	rm -rf /home/ai
	mkdir /home/ai
	chown -R 1000:1000 /home/ai
fi
