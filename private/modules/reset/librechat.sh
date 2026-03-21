#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset librechat##################"
CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.maxi.cloud"
AIKEY=$(jq -r ".ai.keys._server_" /disk/admin/modules/_config_/_cloud_.json)
DBPASSMO=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/," 12 1)
MEILISEARCH_KEY=$(jq -r ".key" /disk/admin/modules/_config_/meilisearch.json)
cd /disk/admin/modules
systemctl stop librechat.service

MONGODB_PASSWORD=$(jq -r ".password" /disk/admin/modules/_config_/mongodb.json)
mongosh --host 127.0.0.1 -u admin --authenticationDatabase admin -p $MONGODB_PASSWORD <<EOF
use librechatDB
db.dropDatabase()
db.dropUser("librechatUser")
db.createUser({
	user: "librechatUser",
	pwd: "${DBPASSMO}",
	roles: [
		{ role: "readWrite", db: "librechatDB" },
		{ role: "dbAdmin", db: "librechatDB" }
	]
});
EOF

PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)

rm -rf /disk/admin/modules/librechat
mkdir -p /disk/admin/modules/librechat/logs
cp /usr/local/modules/librechat/.env.example /disk/admin/modules/librechat/.env
cat > /disk/admin/modules/librechat/librechat.yaml << EOF
version: 1.3.0

cache: true

interface:
  modelSelect: true
  parameters: true
  endpointsMenu: true
  defaultEndpoint: "Internal System"

endpoints:
  custom:
    - name: "Internal System"
      baseURL: "https://aiproxy.maxi.cloud/v1"
      apiKey: "${AIKEY}"
      models:
        default: ["default"]
        fetch: true
      summarize: false
EOF
sed -i -e "s|^MEILI_HOST=.*|MEILI_HOST=http://127.0.0.1:7700|" /disk/admin/modules/librechat/.env
sed -i -e "s|^MEILI_MASTER_KEY=.*|MEILI_MASTER_KEY=$MEILISEARCH_KEY|" /disk/admin/modules/librechat/.env
sed -i -e "s|^MONGO_URI=.*|MONGO_URI=mongodb://librechatUser:${DBPASSMO}@127.0.0.1:27017/librechatDB|" /disk/admin/modules/librechat/.env
chown admin:admin /disk/admin/modules/librechat

cd /usr/local/modules/librechat
NODE_DEBUG=mongoose npm run create-user -- ${EMAIL} ${CLOUDNAME} ${CLOUDNAME} ${PASSWD} --email-verified=false > /dev/null
echo "{\"email\":\"${EMAIL}\", \"username\":\"${CLOUDNAME}\", \"password\":\"${PASSWD}\", \"dbname\":\"librechatDB\", \"dbuser\":\"librechatUser\", \"dbpass\":\"${DBPASSMO}\"}" > /disk/admin/modules/_config_/librechat.json

systemctl start librechat.service
systemctl enable librechat.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
