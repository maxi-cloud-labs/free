#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/live-codes/livecodes/releases/download/v46/livecodes-v46.tar.gz
mkdir /usr/local/modules/livecodes
tar -xpf livecodes-v46.tar.gz -C /usr/local/modules/livecodes --strip-components=1
