#!/bin/sh

cd /home/ai/build
wget -q --show-progress --progress=bar:force:noscroll https://dl.typesense.org/releases/29.0/typesense-server-29.0-arm64-lg-page16.deb
dpkg -i typesense-server*.deb
systemctl disable typesense-server
rm -f /etc/typesense/typesense-server.ini
ln -sf /disk/admin/modules/typesense/typesense-server.ini /etc/typesense
