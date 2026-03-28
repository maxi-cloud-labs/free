#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for burn [-d disk -e -f -h -r -z]"
echo "d disk:	Set /dev/disk (default: /dev/sda)"
echo "e:	Extract image"
echo "f:	Use final image"
echo "h:	Print this usage and exit"
echo "r:	Resize disk"
echo "z:	Force if disk size is not the usual"
exit 0
}

DISK=/dev/sda
POSTNAME=""
EXTRACT=0
FORCE=0
RESIZE=0
while getopts d:efhz opt; do
	case "$opt" in
		d) DISK="/dev/${OPTARG}";FORCE=1;;
		e) EXTRACT=1;RESIZE=1;;
		f) POSTNAME="-final";;
		h) helper;;
		r) RESIZE=1;;
		z) FORCE=1;;
	esac
done
IMG=../build/img/maxicloud-arm64${POSTNAME}.img

if [ "m`id -u`" != "m0" ]; then
	echo "You need to be root"
	exit 0
fi
if [ ! -b ${DISK}1 ]; then
	echo "No ${DISK}1..."
	exit 0
fi
if [ $FORCE = 0 ]; then
	if [ "m`blockdev --getsize64 ${DISK}`" != "m1024209543168" ]; then
		echo "Disk doesn't have the usual size. Are you sure? You can force with option -z"
		exit 0
	fi
fi

cd `dirname $0`
echo "Current directory is now `pwd`"

umount ${DISK}*
umount ${DISK}*
if [ -b ${DISK}0 ]; then
	OFF=${DISK}0
elif [ ! -b ${DISK} -a ${DISK} = "/dev/mmcblk0p" ]; then
		OFF=/dev/mmcblk0
else
	OFF=${DISK}
fi
echo 3 > /proc/sys/vm/drop_caches
dd if=${IMG} of=${OFF} bs=31M status=progress
sync
umount ${DISK}*
umount ${DISK}*
if [ $RESIZE = 1 ]; then
	growpart ${OFF} 2
	sleep 1
	resize2fs ${DISK}2
	#e2fsck -f -p ${DISK}2
fi
if [ $EXTRACT = 1 ]; then
	mount ${DISK}2 /tmp/2
	unsquashfs -f -d /tmp/2 /tmp/2/fs/os.img
	rm -rf /tmp/2/fs/
	cp ../build/img/initramfs_2712.orig /tmp/1/initramfs_2712
	sync
	umount ${DISK}*
	umount ${DISK}*
fi
