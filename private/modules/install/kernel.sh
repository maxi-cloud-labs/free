#!/bin/sh

lsb_release -a | grep trixie
if [ $? = 0 ]; then
	OS="pios"
fi
lsb_release -a | grep noble
if [ $? = 0 ]; then
	OS="ubuntu"
fi

if [ $OS = "ubuntu" ]; then
	echo "apt-get -y install linux-headers-rpi-2712 linux-image-rpi-2712 linux-headers-6.12.34+rpt-common-rpi linux-headers-6.12.34+rpt-rpi-2712 linux-image-6.12.34+rpt-rpi-2712 linux-kbuild-6.12.34+rpt"
	wget -q --show-progress --progress=bar:force:noscroll https://archive.raspberrypi.org/debian/pool/main/l/linux/linux-headers-rpi-2712_6.12.34-1+rpt1_arm64.deb
	wget -q --show-progress --progress=bar:force:noscroll https://archive.raspberrypi.org/debian/pool/main/l/linux/linux-image-rpi-2712_6.12.34-1+rpt1_arm64.deb
	wget -q --show-progress --progress=bar:force:noscroll https://archive.raspberrypi.org/debian/pool/main/l/linux/linux-headers-6.12.34+rpt-common-rpi_6.12.34-1+rpt1_all.deb
	wget -q --show-progress --progress=bar:force:noscroll https://archive.raspberrypi.org/debian/pool/main/l/linux/linux-headers-6.12.34+rpt-rpi-2712_6.12.34-1+rpt1_arm64.deb
	wget -q --show-progress --progress=bar:force:noscroll https://archive.raspberrypi.org/debian/pool/main/l/linux/linux-image-6.12.34+rpt-rpi-2712_6.12.34-1+rpt1_arm64.deb
	wget -q --show-progress --progress=bar:force:noscroll https://archive.raspberrypi.org/debian/pool/main/l/linux/linux-kbuild-6.12.34+rpt_6.12.34-1+rpt1_arm64.deb
	apt-get -y install cpp-14-aarch64-linux-gnu gcc-14 gcc-14-aarch64-linux-gnu libgcc-14-dev pahole
	dpkg -i linux-*.deb
elif [ $OS = "pios" ]; then
	apt-get -y purge linux-headers*rpi-v8 linux-image*rpi-v8
	rm -f /boot/cmdline.txt /boot/issue.txt /boot/config.txt
	rm -f /boot/firmware/LICENCE.broadcom /boot/firmware/issue.txt
fi

cd /home/ai/kernel
make
mkdir -p /boot/firmware/overlays
make install

echo -n " modules-load=dwc2,libcomposite,configs,dongle" >> /boot/firmware/cmdline.txt
sed -i -e 's/console=serial0,115200 console=tty1/console=tty1 console=serial0,115200/' /boot/firmware/cmdline.txt
sed -i -e 's/ root=[^ ]* / root=LABEL=rootfs /' /boot/firmware/cmdline.txt
sed -i -e 's/cfg80211.ieee80211_regdom=US/cfg80211.ieee80211_regdom=00/' /boot/firmware/cmdline.txt
cat > /boot/firmware/config.txt <<EOF
auto_initramfs=1
arm_64bit=1
arm_boost=1

[all]
dtoverlay=dwc2
dtoverlay=dongle
dtoverlay=st7735s
dtoverlay=buttons
dtoverlay=leds
dtoverlay=uart2
dtparam=uart0=on
dtparam=spi=on
dtparam=pciex1=1
dtparam=nvme
EOF
