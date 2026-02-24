#!/bin/sh

cd /home/ai/build
wget -q --show-progress --progress=bar:force:noscroll https://github.com/Sonarr/Sonarr/releases/download/v4.0.16.2944/Sonarr.main.4.0.16.2944.linux-arm64.tar.gz
tar -xzf Sonarr*linux*.tar.gz
mv Sonarr /usr/local/modules/sonarr
