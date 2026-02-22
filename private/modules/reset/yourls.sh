#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset yourls##################"
DATE=$(date +%s)
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
SALT=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
DBPASS=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
DROP DATABASE IF EXISTS yourlsDB;
CREATE DATABASE yourlsDB;
DROP USER IF EXISTS 'yourlsUser'@'localhost';
CREATE USER 'yourlsUser'@'localhost' IDENTIFIED BY '${DBPASS}';
GRANT ALL PRIVILEGES ON yourlsDB.* TO 'yourlsUser'@'localhost';
FLUSH PRIVILEGES;
EOF

rm -rf /disk/admin/modules/yourls
mkdir /disk/admin/modules/yourls
cp /usr/local/modules/yourls/user/config-sample.php /disk/admin/modules/yourls/config.php

dbuser="yourlsUser"
dbname="yourlsDB"
site="https://yourls.${PRIMARY}"

sed -i -e "s|define( 'YOURLS_DB_USER',.*|define( 'YOURLS_DB_USER', '$dbuser' );|" /disk/admin/modules/yourls/config.php
sed -i -e "s|define( 'YOURLS_DB_PASS',.*|define( 'YOURLS_DB_PASS', '$DBPASS' );|" /disk/admin/modules/yourls/config.php
sed -i -e "s|define( 'YOURLS_DB_NAME',.*|define( 'YOURLS_DB_NAME', '$dbname' );|" /disk/admin/modules/yourls/config.php
sed -i -e "s|define( 'YOURLS_SITE',.*|define( 'YOURLS_SITE', '$site' );|" /disk/admin/modules/yourls/config.php
sed -i -e "s|define( 'YOURLS_COOKIEKEY',.*|define( 'YOURLS_COOKIEKEY', '$SALT' );|" /disk/admin/modules/yourls/config.php
sed -i -e "s|	'username' => 'password',.*|	'${CLOUDNAME}' => '${PASSWD}',|" /disk/admin/modules/yourls/config.php

cd /usr/local/modules/yourls
cat > /tmp/yourls.php << EOF
<?php
\$_SERVER['REQUEST_METHOD'] = 'POST';
\$_SERVER['HTTP_USER_AGENT'] = 'PHP-CLI';
\$_SERVER['CONTENT_TYPE'] = 'application/x-www-form-urlencoded';
\$_POST['install'] = '';
include '/usr/local/modules/yourls/admin/install.php';
?>
EOF
php /tmp/yourls.php > /tmp/reset-yourls-${DATE}.log 2>&1
rm /tmp/yourls.php

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
USE yourlsDB;
DELETE FROM yourls_url;
INSERT INTO yourls_url (keyword, url, title, timestamp, ip, clicks) VALUES ('mdc', 'https://mydongle.cloud', 'MyDongle.Cloud website', NOW(), '', 0);
UPDATE yourls_options SET option_value='a:2:{i:0;s:27:"random-shorturls/plugin.php";i:1;s:27:"allow-privatebin/plugin.php";}' WHERE option_name ='active_plugins';
EOF

rm -f /disk/admin/modules/yourls/conf.txt
echo "{\"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"${dbname}\", \"dbuser\":\"${dbuser}\", \"dbpass\":\"${DBPASS}\"}" > /disk/admin/modules/_config_/yourls.json

echo "{ \"a\":\"status\", \"module\":\"$(basename \""$0"\" .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
