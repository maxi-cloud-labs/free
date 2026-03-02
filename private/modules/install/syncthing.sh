#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/syncthing/syncthing/releases/download/v2.0.13/syncthing-linux-arm64-v2.0.13.tar.gz
tar -xpf syncthing-linux*
mv syncthing-linux*/syncthing /usr/local/bin
