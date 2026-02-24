#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset bugzilla##################"
DATE=$(date +%s)
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.mydongle.cloud"
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/-" 12 1)

rm -rf /disk/admin/modules/bugzilla
mkdir -p /disk/admin/modules/bugzilla/data

name="Administrator"

cd /usr/local/modules/bugzilla
./checksetup.pl
expect -c "
set timeout -1
spawn ./checksetup.pl
expect \"Enter the e-mail address of the administrator:\"
send \"${EMAIL}\n\"
expect \"Enter the login name the administrator will log in with:\"
send \"${CLOUDNAME}\n\"
expect \"Enter the real name of the administrator:\"
send \"$name\n\"
expect \"Enter a password for the administrator account:\"
send \"${PASSWD}\n\"
expect \"Please retype the password to verify:\"
send \"${PASSWD}\n\"
expect eof
" > /tmp/reset-bugzilla-${DATE}.log 2>&1
./checksetup.pl >> /tmp/reset-bugzilla-${DATE}.log 2>&1

rm -f /disk/admin/modules/bugzilla/conf.txt
echo "{\"email\":\"${EMAIL}\", \"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/bugzilla.json
chown admin:admin /disk/admin/modules/_config_/bugzilla.json

chown -R admin:admin /disk/admin/modules/bugzilla
chown -R www-data:admin /disk/admin/modules/bugzilla/data
chown -R www-data:admin /disk/admin/modules/bugzilla/localconfig

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
