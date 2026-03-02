#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/portainer/portainer/releases/download/2.33.6/portainer-2.33.6-linux-arm64.tar.gz
tar -xpf portainer*
mv portainer /usr/local/modules/
