#!/bin/sh

cd /usr/local/modules/newapi
cd web
bun install
NODE_OPTIONS="--max-old-space-size=4096" bun run build
cd ..
go build -o /usr/local/bin/newapi
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	cd /home/ai
	rm -rf /usr/local/modules/newapi/
fi
