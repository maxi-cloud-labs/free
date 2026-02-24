#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

echo "#Reset mongodb##################"
DATE=$(date +%s)
PASSWORD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
systemctl stop mongodb.service
rm -rf /disk/admin/modules/mongodb
mkdir /disk/admin/modules/mongodb
mongod --fork --logpath /var/log/mongodb/mongod.log --config /etc/mongod.conf --bind_ip 127.0.0.1 --noauth > /tmp/reset-mongodb-${DATE}.log 2>&1
TIMEOUT=10
echo "10 seconds to watch MongoDB starting..."
while [ $TIMEOUT -gt 0 ]; do
	sleep 1
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout waiting for MongoDB starting" && exit 1
	mongosh --host 127.0.0.1 --eval "db.adminCommand('ping')" > /dev/null 2>&1
	if [ $? = 0 ]; then
		break
	fi
done
echo "Done"
mongosh --host 127.0.0.1 > /dev/null <<EOF
use admin
db.createUser({
	user: "admin",
	pwd: "$PASSWORD",
	roles: [
		{ role: "userAdminAnyDatabase", db: "admin" },
		{ role: "readWriteAnyDatabase", db: "admin" },
		{ role: "clusterAdmin", db: "admin" }
	]
})
db.auth("admin", "$PASSWORD")
db.adminCommand({ shutdown: 1 })
EOF
TIMEOUT=10
echo "10 seconds to watch MongoDB stopping..."
while [ $TIMEOUT -gt 0 ]; do
	pgrep -x mongod > /dev/null
	if [ $? = 1 ]; then
		break
	fi
	sleep 1
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && killall mongod
done
echo "Done"
rm -f /tmp/mongodb-27017.sock /var/log/mongodb/mongod.log
chown -R mongodb:mongodb /disk/admin/modules/mongodb /var/log/mongodb
systemctl start mongodb.service
systemctl enable mongodb.service
echo "{\"username\":\"admin\", \"password\":\"${PASSWORD}\"}" > /disk/admin/modules/_config_/mongodb.json
chown admin:admin /disk/admin/modules/_config_/mongodb.json
{
cat /disk/admin/modules/_config_/adminer.json 2>/dev/null || echo '{}'
echo "{\"mongodb_username\":\"admin\", \"mongodb_password\":\"${PASSWORD}\"}"
} | jq -s 'add' > /disk/admin/modules/_config_/adminer.json.tmp && mv /disk/admin/modules/_config_/adminer.json.tmp /disk/admin/modules/_config_/adminer.json
chown admin:admin /disk/admin/modules/_config_/adminer.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
