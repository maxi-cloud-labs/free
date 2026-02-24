#!/bin/sh

cd /home/ai/build
wget -nv https://github.com/qdrant/qdrant/releases/download/v1.17.0/qdrant-aarch64-unknown-linux-musl.tar.gz
tar -xpf qdrant-aarch64-unknown-linux-musl.tar.gz
chmod a+x qdrant
mv qdrant /usr/local/bin/qdrant
