#!/bin/sh

cd /usr/local/modules/newapi
cd web
bun install
sync
echo 3 > /proc/sys/vm/drop_caches
NODE_OPTIONS="--max-old-space-size=4096" bun run build
sync
echo 3 > /proc/sys/vm/drop_caches
cd ..
go build -o /usr/local/bin/newapi
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	cd /home/ai
	rm -rf /usr/local/modules/newapi/
fi
