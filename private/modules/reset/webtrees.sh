#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset webtrees##################"
DATE=$(date +%s)
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.maxi.cloud"
DBPASSM=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
DROP DATABASE IF EXISTS webtreesDB;
CREATE DATABASE webtreesDB;
DROP USER IF EXISTS 'webtreesUser'@'localhost';
CREATE USER 'webtreesUser'@'localhost' IDENTIFIED BY '${DBPASSM}';
GRANT ALL PRIVILEGES ON webtreesDB.* TO 'webtreesUser'@'localhost';
FLUSH PRIVILEGES;
EOF

rm -rf /disk/admin/modules/webtrees
mkdir /disk/admin/modules/webtrees
cp -a /usr/local/modules/webtrees/data.bak /disk/admin/modules/webtrees/data

prefix="ost_"
dbhost="localhost"
dbname="webtreesDB"
dbuser="webtreesUser"

cd /usr/local/modules/webtrees
cat > /tmp/webtrees.php << EOF
<?php
\$_POST['lang'] = 'en-US';
\$_POST['dbtype'] = 'mysql';
\$_POST['dbhost'] = '$dbhost';
\$_POST['dbport'] = '3306';
\$_POST['dbuser'] = '$dbuser';
\$_POST['dbpass'] = '${DBPASSM}';
\$_POST['dbname'] = '$dbname';
\$_POST['tblpfx'] = '$prefix';
\$_POST['baseurl'] = '';
\$_POST['wtname'] = '${CLOUDNAME}';
\$_POST['wtuser'] = '${CLOUDNAME}';
\$_POST['wtpass'] = '${PASSWD}';
\$_POST['wtemail'] = '${EMAIL}';
\$_POST['step'] = '6';

\$_SERVER['REQUEST_METHOD'] = 'POST';
\$_SERVER['REQUEST_URI'] = '/';
\$_SERVER['HTTP_HOST'] = 'localhost';
\$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
\$_SERVER['HTTP_USER_AGENT'] = 'PHP-CLI';
\$_SERVER['CONTENT_TYPE'] = 'application/x-www-form-urlencoded';

include '/usr/local/modules/webtrees/index.php';
?>
EOF

sed -i -e "s/'cli'/'cli2'/" /usr/local/modules/webtrees/app/Webtrees.php
php /tmp/webtrees.php > /tmp/reset-webtrees-${DATE}.log 2>&1
sed -i -e "s/'cli2'/'cli'/" /usr/local/modules/webtrees/app/Webtrees.php
rm /tmp/webtrees.php

rm -f /disk/admin/modules/webtrees/conf.txt
echo "{\"email\":\"${EMAIL}\", \"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"${dbname}\", \"dbuser\":\"${dbuser}\", \"dbpass\":\"${DBPASSM}\"}" > /disk/admin/modules/_config_/webtrees.json
chown admin:admin /disk/admin/modules/_config_/webtrees.json

chown -R admin:admin /disk/admin/modules/webtrees
chown -R www-data:admin /disk/admin/modules/webtrees/data

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
