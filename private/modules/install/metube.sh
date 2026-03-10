#!/bin/sh

cd /usr/local/modules/metube
/home/ai/rootfs/usr/local/modules/_core_/pip.sh -f /usr/local/modules/metube/penv -s
echo "PATH before any modif: $PATH"
PATHOLD=$PATH
PATH=/usr/local/modules/metube/penv/bin:$PATHOLD
export PATH=/usr/local/modules/metube/penv/bin:$PATHOLD
echo "PATH new: $PATH python: `python --version`"
pip install aiohttp yt_dlp mutagen curl-cffi watchfiles python-socketio
PATH=$PATHOLD
export PATH=$PATHOLD
echo "PATH restored: $PATH"
cd ui
npm ci
yes no | node_modules/.bin/ng build --configuration production
mkdir /disk/admin/modules/metube
