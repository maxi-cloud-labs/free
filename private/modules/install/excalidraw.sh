#!/bin/sh

cd /usr/local/modules/excalidraw
yes | yarn install
NODE_OPTIONS="--max-old-space-size=4096" yarn build
