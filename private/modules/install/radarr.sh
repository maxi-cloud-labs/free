#!/bin/sh

cd /home/ai/build
wget -q --show-progress --progress=bar:force:noscroll https://github.com/Radarr/Radarr/releases/download/v6.0.4.10291/Radarr.master.6.0.4.10291.linux-core-arm64.tar.gz
tar -xzf Radarr*linux*.tar.gz
mv Radarr /usr/local/modules/radarr
