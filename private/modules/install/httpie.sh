#!/bin/sh

apt-get -y install python3-defusedxml python3-multidict python3-pip python3-requests-toolbelt python3-socks
cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll http://deb.debian.org/debian/pool/main/h/httpie/httpie_3.2.4-3_all.deb
dpkg -i httpie*.deb
