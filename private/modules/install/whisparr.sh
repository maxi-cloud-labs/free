#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll -O Whisparr.linux.tar.gz "http://whisparr.servarr.com/v1/update/nightly/updatefile?os=linux&runtime=netcore&arch=arm64"
tar -xzf Whisparr*linux*.tar.gz
mv Whisparr /usr/local/modules/whisparr
