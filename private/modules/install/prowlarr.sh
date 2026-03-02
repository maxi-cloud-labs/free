#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/Prowlarr/Prowlarr/releases/download/v2.3.0.5236/Prowlarr.master.2.3.0.5236.linux-core-arm64.tar.gz
tar -xzf Prowlarr*linux*.tar.gz
mv Prowlarr /usr/local/modules/prowlarr
