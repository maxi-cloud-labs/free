#!/bin/sh

cd /home/ai/build
wget -q --show-progress --progress=bar:force:noscroll https://github.com/jmbannon/ytdl-sub/releases/download/2026.01.13/ytdl-sub_aarch64
chmod +x ytdl-sub_aarch64
mv ytdl-sub_aarch64 /usr/local/bin/ytdl-sub
