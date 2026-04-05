#!/bin/sh

cd /home/ai/build
wget -nv --show-progress --progress=bar:force:noscroll https://github.com/zeroclaw-labs/zeroclaw/releases/download/v0.6.8/zeroclaw-aarch64-unknown-linux-gnu.tar.gz
tar -xpf zeroclaw-aarch64-unknown-linux-gnu.tar.gz
mv zeroclaw /usr/local/bin/
