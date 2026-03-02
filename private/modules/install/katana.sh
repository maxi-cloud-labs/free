#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/projectdiscovery/katana/releases/download/v1.3.0/katana_1.3.0_linux_arm64.zip
unzip katana*.zip
mv katana /usr/local/bin/
