#!/bin/sh

cd /usr/local/modules/dillinger
yes | npm install --production
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	npm prune --production
fi
