#!/bin/sh

cd /home/ai/build
wget -nv --show-progress --progress=bar:force:noscroll https://github.com/silverbulletmd/silverbullet/releases/download/2.5.2/silverbullet-server-linux-aarch64.zip
unzip silverbullet-server-linux-aarch64.zip -d /usr/local/bin
