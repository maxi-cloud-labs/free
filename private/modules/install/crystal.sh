#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://packagecloud.io/84codes/crystal/packages/debian/trixie/crystal_1.18.2-578_arm64.deb/download.deb?distro_version_id=221
mv download.deb* crystal.deb
dpkg -i crystal.deb
