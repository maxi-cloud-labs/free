#!/bin/sh

cd /home/ai/build
wget -nv https://cdn-download.rocket.chat/build/rocket.chat-8.1.1.tgz
mkdir rocketchat
tar -xzf rocket.chat-*.tgz -C rocketchat
cd rocketchat/bundle/programs/server
npm install
cp -a /home/ai/build/rocketchat/bundle /usr/local/modules/rocketchat
