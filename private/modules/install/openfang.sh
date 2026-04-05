#!/bin/sh

cd /home/ai/build
wget -nv --show-progress --progress=bar:force:noscroll https://github.com/RightNow-AI/openfang/releases/download/v0.5.6/openfang-aarch64-unknown-linux-gnu.tar.gz
tar -xpf openfang-aarch64-unknown-linux-gnu.tar.gz
mv openfang /usr/local/bin/
