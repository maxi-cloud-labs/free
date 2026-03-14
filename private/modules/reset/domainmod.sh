#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset domainmod##################"
DATE=$(date +%s)
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.maxi.cloud"
DBPASSM=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
DROP DATABASE IF EXISTS domainmodDB;
CREATE DATABASE domainmodDB;
DROP USER IF EXISTS 'domainmodUser'@'localhost';
CREATE USER 'domainmodUser'@'localhost' IDENTIFIED BY '${DBPASSM}';
GRANT ALL PRIVILEGES ON domainmodDB.* TO 'domainmodUser'@'localhost';
FLUSH PRIVILEGES;
EOF

rm -rf /disk/admin/modules/domainmod
mkdir /disk/admin/modules/domainmod

dbhost="localhost"
dbname="domainmodDB"
dbuser="domainmodUser"
cat > /disk/admin/modules/domainmod/config.inc.php << EOF
<?php
\$web_root = "";
\$dbhostname = '${dbhost}';
\$dbname = '${dbname}';
\$dbusername = '${dbuser}';
\$dbpassword = '${DBPASSM}';
EOF

echo "{\"email\":\"${EMAIL}\", \"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"${dbname}\", \"dbuser\":\"${dbuser}\", \"dbpass\":\"${DBPASSM}\"}" > /disk/admin/modules/_config_/domainmod.json
chown admin:admin /disk/admin/modules/_config_/domainmod.json

chown -R admin:admin /disk/admin/modules/domainmod

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
