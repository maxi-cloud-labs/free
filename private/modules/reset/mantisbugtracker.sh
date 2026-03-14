#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
#	exit 0
fi

echo "#Reset mantisbugtracker##################"
DATE=$(date +%s)
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.maxi.cloud"
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
SALT=$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
DBPASSM=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
DROP DATABASE IF EXISTS mantisbugtrackerDB;
CREATE DATABASE mantisbugtrackerDB;
DROP USER IF EXISTS 'mantisbugtrackerUser'@'localhost';
CREATE USER 'mantisbugtrackerUser'@'localhost' IDENTIFIED BY '${DBPASSM}';
GRANT ALL PRIVILEGES ON mantisbugtrackerDB.* TO 'mantisbugtrackerUser'@'localhost';
FLUSH PRIVILEGES;
EOF

rm -rf /disk/admin/modules/mantisbugtracker
mkdir /disk/admin/modules/mantisbugtracker
cp -a /usr/local/modules/mantisbugtracker/config.bak /disk/admin/modules/mantisbugtracker/config
touch /disk/admin/modules/mantisbugtracker/config/config_inc.php
cp /disk/admin/modules/mantisbugtracker/config/config_inc.php.sample /disk/admin/modules/mantisbugtracker/config/config_inc.php

install="2"
db_type="mysqli"
timezone="UTC"
hostname="localhost"
db_username="mantisbugtrackerUser"
database_name="mantisbugtrackerDB"
admin_username=""
admin_password=""
db_table_prefix="mantis"
db_table_plugin_prefix="plugin"
db_table_suffix="_table"
path="https://mantisbugtracker.${PRIMARY}/"
log_queries="0"

sed -i -e "s/^\\\$g_hostname.*/\\\$g_hostname = '$hostname';/" /disk/admin/modules/mantisbugtracker/config/config_inc.php
sed -i -e "s/^\\\$g_db_username.*/\\\$g_db_username = '$db_username';/" /disk/admin/modules/mantisbugtracker/config/config_inc.php
sed -i -e "s/^\\\$g_db_password.*/\\\$g_db_password = '${DBPASSM}';/" /disk/admin/modules/mantisbugtracker/config/config_inc.php
sed -i -e "s/^\\\$g_database_name.*/\\\$g_database_name = '$database_name';/" /disk/admin/modules/mantisbugtracker/config/config_inc.php
sed -i -e "s/^\\\$g_db_type.*/\\\$g_db_type = '$db_type';/" /disk/admin/modules/mantisbugtracker/config/config_inc.php
sed -i -e "s/^\\\$g_crypto_master_salt.*/\\\$g_crypto_master_salt = '$SALT';/" /disk/admin/modules/mantisbugtracker/config/config_inc.php
echo "\$g_path = '$path';" >> /disk/admin/modules/mantisbugtracker/config/config_inc.php
echo "define( 'COMPRESSION_DISABLED', true );" >> /disk/admin/modules/mantisbugtracker/config/config_inc.php

cd /usr/local/modules/mantisbugtracker
cat > /tmp/mantisbugtracker.php << EOF
<?php
\$_POST['install'] = '$install';
\$_POST['db_type'] = '$db_type';
\$_POST['timezone'] = '$timezone';
\$_POST['hostname'] = '$hostname';
\$_POST['db_username'] = '$db_username';
\$_POST['db_password'] = '${DBPASSM}';
\$_POST['database_name'] = '$database_name';
\$_POST['admin_username'] = '$admin_username';
\$_POST['admin_password'] = '$admin_password';
\$_POST['db_table_prefix'] = '$db_table_prefix';
\$_POST['db_table_plugin_prefix'] = '$db_table_plugin_prefix';
\$_POST['db_table_suffix'] = '$db_table_suffix';
\$_POST['path'] = '$path';
\$_POST['log_queries'] = '$log_queries';

\$_SERVER['REQUEST_METHOD'] = 'POST';

include '/usr/local/modules/mantisbugtracker/admin/install.php';
?>
EOF
php /tmp/mantisbugtracker.php > /tmp/reset-mantisbugtracker-${DATE}.log 2>&1
rm /tmp/mantisbugtracker.php

mysql --defaults-file=/disk/admin/modules/mysql/conf.txt << EOF
USE mantisbugtrackerDB;
UPDATE ${db_table_prefix}_user${db_table_suffix} SET username='${CLOUDNAME}', password=MD5('${PASSWD}'), email='${EMAIL}' WHERE username='administrator';
EOF

echo "{\"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"${database_name}\", \"dbuser\":\"${db_username}\", \"dbpass\":\"${DBPASSM}\"}" > /disk/admin/modules/_config_/mantisbugtracker.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
