#!/bin/sh

cd /home/ai/build
wget -q --show-progress --progress=bar:force:noscroll https://launchpad.net/~qbittorrent-team/+archive/ubuntu/qbittorrent-stable/+files/qbittorrent-nox_5.1.2.99~202507021832-8731-202ff8a09~ubuntu24.10.1_arm64.deb
wget -q --show-progress --progress=bar:force:noscroll https://launchpad.net/~qbittorrent-team/+archive/ubuntu/qbittorrent-stable/+files/libtorrent-rasterbar2.0_2.0.11.git20250701.122c6edb33-1ppa1~24.10_arm64.deb
apt-get -y install libqt6sql6 libqt6xml6 libqt6network6
dpkg -i qbittorrent* libtorrent-rasterbar*
