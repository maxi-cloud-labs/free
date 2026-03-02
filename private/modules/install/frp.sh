#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/fatedier/frp/releases/download/v0.65.0/frp_0.65.0_linux_arm64.tar.gz
tar -xpf frp_*_linux_arm64.tar.gz
mkdir /usr/local/modules/frp
mv frp_*_linux_arm64/frpc /usr/local/modules/frp
