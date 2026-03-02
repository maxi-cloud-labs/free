#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://downloads.openobserve.ai/releases/o2-enterprise/v0.50.3/openobserve-ee-v0.50.3-linux-arm64.tar.gz
tar -xzf openobserve-ee-v0.50.3-linux-arm64.tar.gz
mv openobserve /usr/local/bin
