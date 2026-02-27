#!/bin/sh

cd /usr/local/modules/excalidraw
yes | yarn install
NODE_OPTIONS="--max-old-space-size=4096" yarn build
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	mv excalidraw-app/build /tmp/excalidraw
	cd /usr/local/modules/
	rm -rf /usr/local/modules/excalidraw/
	mv /tmp/excalidraw /usr/local/modules/
fi
