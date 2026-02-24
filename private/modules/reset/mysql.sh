#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset mysql##################"
PASSWORD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
systemctl stop mysql.service
mkdir -p /var/run/mysqld
chown mysql:mysql /var/run/mysqld
mysqld_safe --skip-grant-tables --skip-networking &
TIMEOUT=10
echo "10 seconds to watch mysql starting..."
while [ $TIMEOUT -gt 0 ]; do
	sleep 1
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout waiting for MySQL" && exit 1
	mysql -u root -e "SELECT 1" > /dev/null 2>&1
	if [ $? = 0 ]; then
		break
	fi
done
echo "Done"
mysql -u root <<-EOF
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$PASSWORD';
DROP DATABASE IF EXISTS test;
FLUSH PRIVILEGES;
EOF
mysqladmin -u root -p"$PASSWORD" shutdown
systemctl start mysql.service
echo "[client]\nhost=localhost\nuser=root\npassword=${PASSWORD}" > /disk/admin/modules/mysql/conf.txt
chmod 755 /disk/admin/modules/mysql
chown admin:admin /disk/admin/modules/mysql/conf.txt
echo "{\"username\":\"root\", \"password\":\"${PASSWORD}\"}" > /disk/admin/modules/_config_/mysql.json
chown admin:admin /disk/admin/modules/_config_/mysql.json
{
cat /disk/admin/modules/_config_/adminer.json 2>/dev/null || echo '{}'
echo "{\"mysql_username\":\"root\", \"mysql_password\":\"${PASSWORD}\"}"
} | jq -s 'add' > /disk/admin/modules/_config_/adminer.json.tmp && mv /disk/admin/modules/_config_/adminer.json.tmp /disk/admin/modules/_config_/adminer.json
chown admin:admin /disk/admin/modules/_config_/adminer.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
