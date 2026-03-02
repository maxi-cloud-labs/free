#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/Lidarr/Lidarr/releases/download/v3.1.0.4875/Lidarr.master.3.1.0.4875.linux-core-arm64.tar.gz
tar -xzf Lidarr*linux*.tar.gz
mv Lidarr /usr/local/modules/lidarr
