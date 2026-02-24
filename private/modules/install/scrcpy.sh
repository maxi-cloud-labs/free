#!/bin/sh

apt-get -y install libavformat-dev libavcodec-dev libavutil-dev libswresample-dev libavdevice-dev libusb-1.0-0-dev libsdl2-dev
apt-get -y install adb
cd /usr/local/modules/scrcpy
rm -rf build
meson setup build
meson compile -C build
wget -q --show-progress --progress=bar:force:noscroll -O build/server/scrcpy-server https://github.com/Genymobile/scrcpy/releases/download/v3.3.4/scrcpy-server-v3.3.4
meson install -C build
