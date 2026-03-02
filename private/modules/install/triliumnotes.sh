#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/TriliumNext/Notes/releases/download/v0.95.0/TriliumNextNotes-Server-v0.95.0-linux-arm64.tar.xz
tar -xJpf TriliumNextNotes-Server*
mv TriliumNextNotes-Server-0.*/ /usr/local/modules/triliumnotes
rm -rf /usr/local/modules/triliumnotes/node
