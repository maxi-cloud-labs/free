#!/bin/sh

curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg --dearmor -o /etc/apt/keyrings/mongodb.gpg
echo "deb [arch=arm64 signed-by=/etc/apt/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.2 multiverse" > /etc/apt/sources.list.d/mongodb.list
apt-get update
apt-get -y install mongodb-org
sed -i -e "s|^  dbPath:.*|  dbPath: /disk/admin/modules/mongodb|" /etc/mongod.conf
echo "security.authorization: enabled" >> /etc/mongod.conf
rm -f /usr/lib/systemd/system/mongod.service
