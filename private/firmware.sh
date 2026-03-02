#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for firmware [-c -d disk -f -h -l NB -z]"
echo "c:	Clean build"
echo "d disk:	set /dev/disk[1-2] (sda or mmcblk0p)"
echo "f:	Create final binaries"
echo "h:	Print this usage and exit"
echo "l:	Set loop number"
echo "z:	Force if disk size is not the usual"
exit 0
}

DISK=/dev/sda
LOSETUP=/dev/loop5
POSTNAME=""
FINAL=0
CLEAN=0
FORCE=0
COMPRESSION=3
while getopts cd:fhl:z opt; do
	case "$opt" in
		c) CLEAN=1;;
		d) DISK="/dev/${OPTARG}";;
		f) POSTNAME="-final";FINAL=1;COMPRESSION=22;;
		h) helper;;
		l) LOSETUP=/dev/loop${OPTARG};;
		z) FORCE=1;;
	esac
done

if [ "m`id -u`" != "m0" ]; then
	echo "You need to be root"
	exit 0
fi
cd `dirname $0`
echo "Current directory is now `pwd`"
PP=`pwd`/..

umount ${DISK}*
umount ${DISK}*
sync
if [ ! -b ${DISK}1 ]; then
	echo "No /dev${DISK}1..."
	exit 0
fi

if [ $FORCE = 0 -a "m`blockdev --getsize64 ${DISK}`" != "m128035676160" ]; then
	echo "Disk doesn't have the usual size. Are you sure? You can force with option -z"
	exit 0
fi

DATESTART=`date +%s`

umount ${DISK}*
umount ${DISK}*
rm -f ${PP}/build/img/flasher-m${POSTNAME}-s.img ${PP}/build/img/upgrade.bin ${PP}/build/img/partition1.zip
mount ${DISK}1 /tmp/1
mount ${DISK}2 /tmp/2
cd /tmp/1
zip -q -r ${PP}/build/img/partition1.zip ./bcm2712-rpi-5-b.dtb ./bcm2712-rpi-cm5-cm5io.dtb ./cmdline.txt ./config.txt ./kernel_2712.img ./overlays/overlay_map.dtb ./overlays/bcm2712d0.dtbo ./overlays/dwc2.dtbo ./overlays/dongle.dtbo ./overlays/st7735s.dtbo ./overlays/buttons.dtbo ./overlays/leds.dtbo ./overlays/uart0-pi5.dtbo ./overlays/uart2-pi5.dtbo ./Image ./mydonglecd.dtb
cd ${PP}
ROOTFS=/tmp/2
if [ $CLEAN = 1 ]; then
	rm -f /tmp/os${POSTNAME}.img
fi
if [ -f /tmp/os${POSTNAME}.img ]; then
	echo "No creation as /tmp/os${POSTNAME}.img already exists"
else
	NEWEST=
	if [ ! -f ${PP}/client/src/assets/modulesmeta.json -o $(find ${PP}/private/modules -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d " " -f2-) -nt ${PP}/client/src/assets/modulesmeta.json ]; then
		php ${PP}/private/modules-update.php
	else
		echo "Nothing to update for modules"
	fi
	tar -xjpf /work/ai.inout/private/img/modules-artik.tbz2 -C ${ROOTFS}/lib/modules/
	${PP}/auth/prepare.sh -c
	rm -rf ${PP}/rootfs/usr/local/modules/_core_/reset
	cp -a ${PP}/private/modules/reset/ ${PP}/rootfs/usr/local/modules/_core_/
	rm -rf ${ROOTFS}/usr/local/modules/_core_/reset
	cp -a ${PP}/rootfs/usr/local/modules/_core_/reset ${ROOTFS}/usr/local/modules/_core_/
	cp ${PP}/private/modules/services/* ${ROOTFS}/etc/systemd/system/
	if [ ! -f ${ROOTFS}/usr/local/modules/_core_/app -o $(find ${PP}/app -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d " " -f2-) -nt ${ROOTFS}/usr/local/modules/_core_/app ]; then
		rm -rf ${ROOTFS}/home/ai/app
		cp -a ${PP}/app ${ROOTFS}/home/ai/
		chroot ${ROOTFS} sh -c 'cd /home/ai/app && make clean && make'
	else
		echo "Nothing to update for app"
	fi
	if [ ! -f ${ROOTFS}/usr/local/modules/apache2/mod_app_ip.so -o $(find ${PP}/moduleIpApache2 -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d " " -f2-) -nt ${ROOTFS}/usr/local/modules/apache2/mod_app_ip.so ]; then
		rm -rf ${ROOTFS}/home/ai/moduleIpApache2
		cp -a ${PP}/moduleIpApache2 ${ROOTFS}/home/ai/
		chroot ${ROOTFS} sh -c 'cd /home/ai/moduleIpApache2 && make clean && make'
	else
		echo "Nothing to update for moduleIpApache2"
	fi
	if [ ! -f ${ROOTFS}/usr/local/modules/pam/pam_app.so -o $(find ${PP}/pam -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d " " -f2-) -nt ${ROOTFS}/usr/local/modules/pam/pam_app.so ]; then
		rm -rf ${ROOTFS}/home/ai/pam
		cp -a ${PP}/pam ${ROOTFS}/home/ai/
		chroot ${ROOTFS} sh -c 'cd /home/ai/pam && make clean && make'
	else
		echo "Nothing to update for pam"
	fi
	cp /etc/resolv.conf /tmp/2/etc/resolv.conf
	if [ ! -d ${ROOTFS}/usr/local/modules/betterauth -o $(find ${PP}/auth/src/ -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d " " -f2-) -nt ${ROOTFS}/usr/local/modules/betterauth ]; then
		rm -rf ${ROOTFS}/home/ai/auth
		cp -a ${PP}/auth ${ROOTFS}/home/ai/
		chroot ${ROOTFS} sh -c 'cd /home/ai/auth && ./prepare.sh -i'
	else
		echo "Nothing to update for auth"
	fi
	rm -rf ${PP}/client/web
	cd ${PP}/client
	ionic --prod build
	rm -rf ${ROOTFS}/usr/local/modules/_core_/web
	cp -a ${PP}/client/web ${ROOTFS}/usr/local/modules/_core_
	rm -rf ${PP}/client/web
	if [ ! -f ${ROOTFS}/usr/local/modules/apache2/mod_app.so -o $(find ${PP}/moduleApache2 -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d " " -f2-) -nt ${ROOTFS}/usr/local/modules/apache2/mod_app.so -o $(find ${PP}/private/modules -name "*.json" -printf '%T@ %p\n' | sort -n | tail -1 | cut -d " " -f2-) -nt ${ROOTFS}/usr/local/modules/apache2/mod_app.so ]; then
		rm -rf ${ROOTFS}/home/ai/moduleApache2
		cp -a ${PP}/moduleApache2 ${ROOTFS}/home/ai/
		chroot ${ROOTFS} sh -c 'cd /home/ai/moduleApache2 && make clean && make'
	else
		echo "Nothing to update for moduleApache2"
	fi
	rm -rf ${PP}/login/web
	cd ${PP}/login
	ionic --prod build
	rm -rf ${ROOTFS}/usr/local/modules/apache2/web
	cp -a ${PP}/login/web ${ROOTFS}/usr/local/modules/apache2
	rm -rf ${PP}/login/web
	rm -rf ${ROOTFS}/home/admin.default
	cp -a ${ROOTFS}/disk/admin ${ROOTFS}/home/admin.default
	rm -f /tmp/squashfs-exclude.txt
	rm -f /tmp/squashfs-exclude.txt
	cat >> /tmp/squashfs-exclude.txt <<EOF
./disk/
./home/ai/build/
./home/gregoire/
EOF
	sed -i -e 's|#LABEL=rootfs  /disk|LABEL=rootfs  /disk|' ${ROOTFS}/etc/fstab
	echo "######## WARNING ########"
	echo "${ROOTFS}/etc/fstab has been modified. It will be reverted once squashfs is finished"
	cd ${ROOTFS}
	DATESTARTS=`date +%s`
	mksquashfs . /tmp/os${POSTNAME}.img -comp zstd -Xcompression-level $COMPRESSION -b 256K -ef /tmp/squashfs-exclude.txt
	DATEFINISHS=`date +%s`
	DELTAS=$((DATEFINISHS - DATESTARTS))
	echo "Squashfs done in $((DELTAS / 60))m $((DELTAS % 60))s"
	cd ${PP}
	sed -i -e 's|LABEL=rootfs  /disk|#LABEL=rootfs  /disk|' ${ROOTFS}/etc/fstab
	rm -f /tmp/squashfs-exclude.txt
fi
sync
umount ${DISK}*
umount ${DISK}*

#dd if=${PP}/build/img/sdcard-bootdelay1-m-s of=${PP}/build/img/flasher-m${POSTNAME}-s.img bs=$((1024 * 1024))
SIZEOS=$(stat -c %s /tmp/os${POSTNAME}.img)
echo "Squashfs Size: $((SIZEOS / 1024 / 1024)) MiB = $((SIZEOS / 1024 / 1024 / 1024)) GiB"
SIZE=$(((SIZEOS + (1024 + 128 + 4) * 1024 * 1024) / 1024 / 1024 / 4))
echo "Img Size: $((SIZE * 4)) MiB = $((SIZE * 4 / 1024)) GiB"
fallocate -l $((SIZE * 4 * 1024 * 1024)) ${PP}/build/img/flasher-m${POSTNAME}-s.img
dd if=${PP}/build/img/sdcard-bootdelay1-m-s of=${PP}/build/img/flasher-m${POSTNAME}-s.img bs=$((1024 * 1024)) conv=notrunc
#dd if=/dev/zero of=${PP}/build/img/flasher-m${POSTNAME}-s.img bs=$((4 * 1024 * 1024)) count=$SIZE seek=1 conv=notrunc status=progress
echo -n '\061' | dd of=${PP}/build/img/flasher-m${POSTNAME}-s.img bs=1 seek=4194303 conv=notrunc
losetup --show ${LOSETUP} ${PP}/build/img/flasher-m${POSTNAME}-s.img
sfdisk -f ${LOSETUP} << EOF
8192,262144,c
270336,
EOF
sync
partprobe ${LOSETUP}
sync
losetup -d ${LOSETUP}
sync
sync
losetup --partscan --show ${LOSETUP} ${PP}/build/img/flasher-m${POSTNAME}-s.img
if [ $? != 0 ]; then
	echo "ERROR losetup"
	exit 1
fi
mkfs.fat -F 32 ${LOSETUP}p1
fatlabel ${LOSETUP}p1 bootfs
mkfs.ext4 ${LOSETUP}p2
tune2fs -O encrypt ${LOSETUP}p2
e2label ${LOSETUP}p2 rootfs
sync
umount ${LOSETUP}*
umount ${LOSETUP}*
mount ${LOSETUP}p1 /tmp/1
unzip -q -d /tmp/1/ ${PP}/build/img/partition1.zip
cp ${PP}/build/img/initramfs_2712 /tmp/1
mount ${LOSETUP}p2 /tmp/2
rm -rf /tmp/2/lost+found/
mkdir -p /tmp/2/fs/upper/ /tmp/2/fs/lower/ /tmp/2/fs/overlay/ /tmp/2/fs/work/
rsync -ah --info=progress2 /tmp/os${POSTNAME}.img /tmp/2/fs/
sync
sync
umount ${LOSETUP}*
umount ${LOSETUP}*
e2fsck -f -p ${LOSETUP}p2
mount ${LOSETUP}p2 /tmp/2
rm -rf /tmp/2/lost+found
umount ${LOSETUP}*
umount ${LOSETUP}*
e2fsck -f -p ${LOSETUP}p2
sync
losetup -d ${LOSETUP}

if [ $FINAL = 1 ]; then
	zip -j ${PP}/build/img/upgrade.bin ${PP}/build/img/partition1.zip /tmp/os${POSTNAME}.img

	cd ${PP}/client
	ionic build --prod
	ionic cap sync android --prod
	cd ${PP}

	echo "*******************************************************"
	echo -n "\e[34m"
	echo "cd ${PP}/client"
	echo "tar -cjpf a.tbz2 app && scp a.tbz2 gregoire@server:/home/gregoire/ && rm -f a.tbz2"
	echo "cd ${PP}/private/img"
	echo "scp upgrade.bin flasher-m-final-s.img gregoire@server:/home/gregoire"
	echo -n "\e[m"
	echo "*******************************************************"
	echo -n "\e[31m"
	cat <<EOF
cd /var/www/mydonglecloud
rm -rf app && tar -xjpf ~/a.tbz2 && rm ~/a.tbz2
sed -i -e 's|<base href="/"|<base href="/app/"|' app/index.html

RELEASE=`date +'%Y-%m-%m'`
cd /var/www/mydonglecloud/firmware
mkdir -p \$RELEASE
cd \$RELEASE
mv ~/flasher-m-final-s.img flasher-\$RELEASE.img
touch -t \${RELEASE//\-/}1048 f* .f* .l*

cd ..
ln -sf \$RELEASE/upgrade-\$RELEASE.bin upgrade.bin
ln -sf \$RELEASE/.upgrade-\$RELEASE.md5sum upgrade.md5sum
ln -sf \$RELEASE/flasher-\$RELEASE.img flasher.img
ln -sf \$RELEASE/.flasher-\$RELEASE.md5sum flasher.md5sum

chown -R www-data:www-data /var/www/

echo -n "\$RELEASE" > version
echo -n "\$RELEASE" > version-app
EOF
	echo -n "\e[m"
	echo "*******************************************************"
fi

DATEFINISH=`date +%s`
DELTA=$((DATEFINISH - DATESTART))
echo "Done in $((DELTA / 60))m $((DELTA % 60))s"
