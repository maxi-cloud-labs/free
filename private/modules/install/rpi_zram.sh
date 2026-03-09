#!/bin/sh

mkdir /etc/rpi/swap.conf.d/
cat > /etc/rpi/swap.conf.d/zram-custom.conf << EOF
[Main]
Mechanism=zram

[Zram]
RamMultiplier=1
MaxSizeMiB=4096
EOF
