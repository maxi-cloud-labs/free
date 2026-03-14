#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Create user tabby##################"
PORT=8100
URL="http://localhost:$PORT"
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout port waiting for tabby" && exit
	nc -z localhost $PORT 2> /dev/null
	if [ $? = 0 ]; then
		break
	fi
done
TIMEOUT=20
while [ $TIMEOUT -gt 0 ]; do
	sleep 3
	TIMEOUT=$((TIMEOUT - 1))
	[ $TIMEOUT -eq 0 ] && echo "Timeout api waiting for jellyfin" && exit
	response=`curl -sS -X POST http://localhost:8100/graphql -H "Content-Type: application/json" --data-binary "{}"`
	if [ $? = 0 ]; then
		break
	fi
done
echo "Doing tabby user"

CLOUDNAME=$(jq -r ".info.name" /disk/admin/modules/_config_/_cloud_.json)
EMAIL="admin@${CLOUDNAME}.maxi.cloud"
PRIMARY=$(jq -r ".info.primary" /disk/admin/modules/_config_/_cloud_.json)
PASSWD=$(pwgen -B -c -y -n -r "\"\!\'\`\$@~#%^&*()+={[}]|:;<>?/" 12 1)
URL2="https://aicode.${PRIMARY}"

curl -sS --fail -o /tmp/tabby.txt -X POST $URL/graphql -H "Content-Type: application/json" --data-binary "{ \"operationName\":\"register\", \"query\":\"mutation register(\$name: String!, \$email: String!, \$password1: String!, \$password2: String!, \$invitationCode: String) { register( name: \$name email: \$email password1: \$password1 password2: \$password2 invitationCode: \$invitationCode ) { accessToken refreshToken __typename } }\", \"variables\":{\"email\":\"${EMAIL}\", \"name\":\"${CLOUDNAME}\", \"password1\":\"${PASSWD}\", \"password2\":\"${PASSWD}\" } }"
token=`jq -r ".data.register.accessToken" /tmp/tabby.txt`
#echo $token
rm -f /tmp/tabby.txt

data="{ \"operationName\":\"updateNetworkSettingMutation\", \"query\":\"mutation updateNetworkSettingMutation(\$input: NetworkSettingInput) { updateNetworkSetting(input: \$input) }\", \"variables\":{ \"input\":{ \"externalUrl\":\"${URL2}\" } } }"
data=`echo $data | sed -e 's/NetworkSettingInput/NetworkSettingInput!/'`
response=`curl -sS -X POST http://localhost:8100/graphql -H "Content-Type: application/json" -H "Authorization: Bearer $token" --data-binary "$data"`
#echo $response

echo "{\"name\":\"${CLOUDNAME}\", \"email\":\"${EMAIL}\", \"password\":\"${PASSWD}\"}" > /disk/admin/modules/_config_/tabby.json

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 -user.sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
