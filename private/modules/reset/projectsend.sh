#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset projectsend##################"
DATE=$(date +%s)
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.mydongle.cloud"
DBPASS=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
DROP DATABASE IF EXISTS projectsendDB;
CREATE DATABASE projectsendDB;
DROP USER IF EXISTS 'projectsendUser'@'localhost';
CREATE USER 'projectsendUser'@'localhost' IDENTIFIED BY '${DBPASS}';
GRANT ALL PRIVILEGES ON projectsendDB.* TO 'projectsendUser'@'localhost';
FLUSH PRIVILEGES;
EOF

rm -rf /disk/admin/modules/projectsend
mkdir /disk/admin/modules/projectsend
mkdir /disk/admin/modules/projectsend/cache
cp -a /usr/local/modules/projectsend/upload/files.bak /disk/admin/modules/projectsend/files
cp -a /usr/local/modules/projectsend/upload/temp.bak /disk/admin/modules/projectsend/temp
cp -a /usr/local/modules/projectsend/includes/sys.config.sample.php /disk/admin/modules/projectsend/sys.config.php

dbname="projectsendDB"
dbuser="projectsendUser"
title="projectsend"

sed -i -e "s|define('DB_NAME',.*|define('DB_NAME', '$dbname');|" /disk/admin/modules/projectsend/sys.config.php
sed -i -e "s|define('DB_USER',.*|define('DB_USER', '$dbuser');|" /disk/admin/modules/projectsend/sys.config.php
sed -i -e "s|define('DB_PASSWORD',.*|define('DB_PASSWORD', '$DBPASS');|" /disk/admin/modules/projectsend/sys.config.php


cd /usr/local/modules/projectsend
cat > /tmp/projectsend.php << EOF
<?php
\$_POST['install_title'] = '$title';
\$_POST['admin_name'] = '${CLOUDNAME}';
\$_POST['admin_email'] = '${EMAIL}';
\$_POST['admin_username'] = '${CLOUDNAME}';
\$_POST['admin_pass'] = '${PASSWD}';

\$_SERVER['REQUEST_METHOD'] = 'POST';

include '/usr/local/modules/projectsend/install/index.php';
?>
EOF
php /tmp/projectsend.php > /tmp/reset-projectsend-${DATE}.log 2>&1
rm /tmp/projectsend.php

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
USE projectsendDB;
INSERT INTO tbl_options (name, value) VALUES ('show_upgrade_success_message', true);
EOF

rm -f /disk/admin/modules/projectsend/conf.txt
echo "{\"mail\":\"${EMAIL}\", \"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"${dbname}\", \"dbuser\":\"${dbuser}\", \"dbpass\":\"${DBPASS}\"}" > /disk/admin/modules/_config_/projectsend.json
chown admin:admin /disk/admin/modules/_config_/projectsend.json


chown -R admin:admin /disk/admin/modules/projectsend
chown -R www-data:admin /disk/admin/modules/projectsend/sys.config.php /disk/admin/modules/projectsend/files /disk/admin/modules/projectsend/temp /disk/admin/modules/projectsend/cache

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
