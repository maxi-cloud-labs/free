#!/bin/sh

cd /usr/local/modules/docsify
npm install
npm run build
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	rm -rf node_modules
fi
