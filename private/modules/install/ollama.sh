#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll -O ollama.sh https://ollama.com/install.sh
sh ollama.sh
mkdir /usr/local/modules/ollama
mv /usr/local/bin/ollama  /usr/local/modules/ollama
mv /usr/local/lib/ollama /usr/local/modules/ollama/lib
mv /usr/share/ollama /usr/local/modules/ollama/share
