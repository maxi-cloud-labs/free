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

COOKIE_JAR=$(mktemp)
PORT=`jq -r .domainmod.localPort /usr/local/modules/_core_/web/assets/modulesdefault.json`
response=`curl -sS -L -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://localhost:$PORT/install/language/index.php -d new_language=en_US.UTF-8`
response=`curl -sS -L -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://localhost:$PORT/install/requirements/index.php`
response=`curl -sS -L -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://localhost:$PORT/install/currency/index.php -d new_currency=USD`
response=`curl -sS -L -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://localhost:$PORT/install/timezone/index.php -d new_timezone=America/Los_Angeles`
response=`curl -sS -L -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://localhost:$PORT/install/email-admin/index.php -d new_admin_email1=$EMAIL -d new_admin_email2=$EMAIL`
response=`curl -sS -L -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST http://localhost:$PORT/install/email-system/index.php -d new_system_email1=$EMAIL -d new_system_email2=$EMAIL`
rm -f COOKIE_JAR

HASH=$(php -r "echo password_hash('$PASSWD', PASSWORD_BCRYPT, ['cost' => 12]);")
mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
USE domainmodDB;
UPDATE users SET new_password=0, password='$HASH' where id=1;
EOF

echo "{\"email\":\"${EMAIL}\", \"username\":\"admin\", \"password\":\"${PASSWD}\", \"dbname\":\"${dbname}\", \"dbuser\":\"${dbuser}\", \"dbpass\":\"${DBPASSM}\"}" > /disk/admin/modules/_config_/domainmod.json
chown admin:admin /disk/admin/modules/_config_/domainmod.json

chown -R admin:admin /disk/admin/modules/domainmod

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
