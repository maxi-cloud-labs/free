#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for otg [-h -m -s -x]"
echo "h:		Print this usage and exit"
echo "m:		Force MTP"
echo "s:		Force serial"
echo "x:		Stop everything"
exit 0
}

if [ "m`id -u`" != "m0" ]; then
	echo "You need to be root"
	exit 0
fi

MANUFACTURER="MyDongle.Cloud"
PRODUCT="MyDongle.Cloud `cat /dev/dongle_platform/model | sed 's/./\U&/'`"
SERIAL=`cat /dev/dongle_platform/serial`
VERSION=`cat /usr/local/modules/_core_/version.txt`
MODEL=`cat /dev/dongle_platform/model`
PATHg1=/sys/kernel/config/usb_gadget/mygadget
FFS="ffs.mtp"
STOP=0
SERIAL=0
MTP=0
while getopts hmsx opt
do
	case "$opt" in
		h) helper;;
		m) MTP=1;;
		s) SERIAL=1;;
		x) STOP=1;;
	esac
done

if [ $OPTIND = 1 ]; then
	if [ -f /disk/admin/modules/_config_/_modules_.json ]; then
		L=`jq -r ".umtpresponder.features | length" /disk/admin/modules/_config_/_modules_.json`
		if [ $L != 0 ]; then
			jq -r ".umtpresponder.features" /disk/admin/modules/_config_/_modules_.json | grep -qi serial
			if [ $? = 0 ]; then
				SERIAL=1
			fi
			jq -r ".umtpresponder.features" /disk/admin/modules/_config_/_modules_.json | grep -qi mtp
			if [ $? = 0 ]; then
				MTP=1
			fi
		fi
	fi
	if [ $MTP = 0 -a $SERIAL = 0 ]; then
		jq -r ".umtpresponder.features" /usr/local/modules/_core_/web/assets/modulesdefault.json | grep -qi serial
		if [ $? = 0 ]; then
			SERIAL=1
		fi
		jq -r ".umtpresponder.features" /usr/local/modules/_core_/web/assets/modulesdefault.json | grep -qi mtp
		if [ $? = 0 ]; then
			MTP=1
		fi
	fi
fi

if [ $STOP = 1 ]; then
	echo "Stopping OTG"
else
	echo "Starting OTG in MTP:${MTP} Serial:${SERIAL}"
fi

if [ $MODEL = "Dongle Std" ]; then
	PATHg1=/tmp/config/usb_gadget/g1
	FFS="ffs.usb0"
fi

if [ $STOP = 1 ]; then
	if [ $MODEL = "Dongle Std" -a ! -d /tmp/config ]; then
		echo "configfs is not mounted. Exiting"
		exit 0
	fi
	SERIAL=0
	MTP=0
	if [ -d $PATHg1/configs/c.1/acm.usb0 ]; then
		SERIAL=1
	fi
	if [ -d $PATHg1/configs/c.1/$FFS ]; then
		MTP=1
	fi
	if [ $SERIAL = 1 ]; then
		touch /tmp/noacm
		#killall getty
		sleep 1
	fi
	if [ $MTP = 1 ]; then
		killall umtprd
		umount /dev/ffs-mtp
	fi
	echo "" > $PATHg1/UDC
	if [ $SERIAL = 1 ]; then
		rm -f $PATHg1/configs/c.1/acm.usb0
	fi
	if [ $MTP = 1 ]; then
		rm -f $PATHg1/configs/c.1/$FFS
	fi
	rm $PATHg1/os_desc/c.1
	rmdir $PATHg1/configs/c.1/strings/0x409
	rmdir $PATHg1/configs/c.1
	if [ $SERIAL = 1 ]; then
		rmdir $PATHg1/functions/acm.usb0
	fi
	if [ $MTP = 1 ]; then
		rmdir $PATHg1/functions/$FFS
	fi
	rmdir $PATHg1/strings/0x409
	rmdir $PATHg1
	if [ $MODEL = "Dongle Std" ]; then
		umount /tmp/config
		rmdir /tmp/config
	fi
	exit 0
fi

if [ $MODEL = "Dongle Std" ]; then
	if [ ! -d /tmp/config ]; then
		mkdir /tmp/config
		mount -t configfs none /tmp/config
	fi
fi
mkdir $PATHg1
cd $PATHg1
echo 0x100 > $PATHg1/bcdDevice
echo 0x200 > $PATHg1/bcdUSB
mkdir $PATHg1/strings/0x409


echo -n $MANUFACTURER > $PATHg1/strings/0x409/manufacturer
echo -n $PRODUCT > $PATHg1/strings/0x409/product
echo -n $SERIAL > $PATHg1/strings/0x409/serialnumber
sed -i -e "s/manufacturer.*/manufacturer \"${MANUFACTURER}\"/" /disk/admin/modules/mtp/umtprd.conf
sed -i -e "s/product.*/product \"${PRODUCT}\"/" /disk/admin/modules/mtp/umtprd.conf
sed -i -e "s/serial.*/serial \"${SERIAL}\"/" /disk/admin/modules/mtp/umtprd.conf
sed -i -e "s/firmware_version.*/firmware_version \"${VERSION}\"/" /disk/admin/modules/mtp/umtprd.conf
echo 0x0 > $PATHg1/bDeviceClass
echo 0x0 > $PATHg1/bDeviceSubClass
echo 0x0 > $PATHg1/bDeviceProtocol
mkdir -p $PATHg1/configs/c.1/strings/0x409
echo "Config 1: Mass Storage" > $PATHg1/configs/c.1/strings/0x409/configuration
echo 250 > $PATHg1/configs/c.1/MaxPower
echo 1 > $PATHg1/os_desc/b_vendor_code
echo "MSFT100" > $PATHg1/os_desc/qw_sign
ln -s configs/c.1 os_desc
echo 1 > $PATHg1/os_desc/use
if [ $SERIAL = 1 ]; then
	echo "0x0525" > $PATHg1/idVendor
	echo "0xa4a7" > $PATHg1/idProduct
	mkdir $PATHg1/functions/acm.usb0
	ln -s functions/acm.usb0 configs/c.1/
fi
if [ $MTP = 1 ]; then
	echo "0x18d1" > $PATHg1/idVendor
	echo "0x4ee1" > $PATHg1/idProduct
	mkdir $PATHg1/functions/$FFS
	ln -s functions/$FFS configs/c.1/
	mkdir -p /dev/ffs-mtp
	mount -t functionfs mtp /dev/ffs-mtp
	/usr/local/bin/umtprd -conf /disk/admin/modules/mtp/umtprd.conf &
	sleep 1
fi
ls /sys/class/udc/ > $PATHg1/UDC
echo "OTG done" > /dev/dongle_platform/printk
echo "Configuration OTG done"
