#!/bin/sh

cd /usr/local/modules/newapi
cd web
bun install
NODE_OPTIONS="--max-old-space-size=4096" bun run build
cd ..
go build -o /usr/local/bin/newapi
cd /home/ai
#rm -rf /usr/local/modules/newapi
