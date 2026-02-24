#!/bin/sh

cd /usr/local/modules/rpi_zram
sed -i -e 's@ExecStart=.*@ExecStart=/usr/local/modules/rpi_zram/zram.sh@' rpi-zram.service
sed -i -e 's@ExecStop=.*@ExecStop=/usr/local/modules/rpi_zram/zram.sh stop@' rpi-zram.service
ln -sf /usr/local/modules/rpi_zram/rpi-zram.service /etc/systemd/system/
systemctl enable rpi-zram
