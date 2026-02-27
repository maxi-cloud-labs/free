#!/bin/sh

cd /usr/local/modules/typesensedashboard
npm install
./node_modules/.bin/quasar prepare
PUBLIC_PATH=./ ./node_modules/.bin/quasar build
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	mv dist/spa /tmp/typesensedashboard
	cd /usr/local/modules/
	rm -rf /usr/local/modules/typesensedashboard/
	mv /tmp/typesensedashboard /usr/local/modules/
fi
ln -sf /disk/admin/modules/typesensedashboard/config.json /usr/local/modules/typesensedashboard/dist/spa/
