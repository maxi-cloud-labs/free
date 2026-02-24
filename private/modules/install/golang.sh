#!/bin/sh

cd /home/ai/build
wget -q --show-progress --progress=bar:force:noscroll https://go.dev/dl/go1.25.5.linux-arm64.tar.gz
rm -rf /usr/local/go
tar -C /usr/local -xzf go1.25.5.linux-arm64.tar.gz
ln -sf /usr/local/go/bin/go /usr/local/bin
ln -sf /usr/local/go/bin/gofmt /usr/local/bin
