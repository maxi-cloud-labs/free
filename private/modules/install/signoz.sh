#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/SigNoz/signoz/releases/download/v0.108.0/signoz-community_linux_arm64.tar.gz
tar -xpf signoz-community_linux_arm64.tar.gz
mv signoz-community_linux_arm64 /usr/local/modules/signoz
