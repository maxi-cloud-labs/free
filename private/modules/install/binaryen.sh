#!/bin/sh

apt-get -y install binaryen
cd /home/ai/build
mkdir binaryen
cd binaryen
wget -nv --show-progress --progress=bar:force:noscroll https://raw.githubusercontent.com/extism/js-pdk/main/install.sh
bash install.sh
