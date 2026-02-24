#!/bin/sh

cd /home/ai/build
wget -q --show-progress --progress=bar:force:noscroll https://github.com/vi/websocat/releases/download/v1.14.1/websocat.aarch64-unknown-linux-musl
chmod a+x websocat.aarch64-unknown-linux-musl
mv websocat.aarch64-unknown-linux-musl /usr/local/bin/websocat
