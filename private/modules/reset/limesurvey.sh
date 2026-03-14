#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset limesurvey##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.maxi.cloud"
DBPASSM=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
DROP DATABASE IF EXISTS limesurveyDB;
CREATE DATABASE limesurveyDB;
DROP USER IF EXISTS 'limesurveyUser'@'localhost';
CREATE USER 'limesurveyUser'@'localhost' IDENTIFIED BY '${DBPASSM}';
GRANT ALL PRIVILEGES ON limesurveyDB.* TO 'limesurveyUser'@'localhost';
FLUSH PRIVILEGES;
EOF

rm -rf /disk/admin/modules/limesurvey
mkdir /disk/admin/modules/limesurvey
cp /usr/local/modules/limesurvey/application/config/config.php.bak /disk/admin/modules/limesurvey/
cp /usr/local/modules/limesurvey/application/config/security.php.bak /disk/admin/modules/limesurvey/
cp -a /usr/local/modules/limesurvey/upload.bak /disk/admin/modules/limesurvey/upload

dbname="limesurveyDB"
dbuser="limesurveyUser"

cd /usr/local/modules/limesurvey

echo "{\"email\":\"${EMAIL}\", \"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"${dbname}\", \"dbuser\":\"${dbuser}\", \"dbpass\":\"${DBPASSM}\"}" > /disk/admin/modules/_config_/limesurvey.json
chown admin:admin /disk/admin/modules/_config_/limesurvey.json

chown -R www-data:admin /disk/admin/modules/limesurvey

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
