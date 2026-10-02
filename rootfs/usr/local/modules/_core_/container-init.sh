#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for container [-h -x]"
echo "h:		Print this usage and exit"
echo "x:		Stop everything"
exit 0
}

if [ "m`id -u`" != "m0" ]; then
	echo "You need to be root"
	exit 0
fi

STOP=0
while getopts hx opt
do
	case "$opt" in
		h) helper;;
		x) STOP=1;;
	esac
done

if [ $STOP = 1 ]; then
	ip link del firecracker0
	exit
fi

ip tuntap add dev firecracker0 mode tap
ip addr add 169.254.10.254/24 broadcast 169.254.10.255 dev firecracker0
ip link set dev firecracker0 up
iptables -t nat -A POSTROUTING -o wlan0 -j MASQUERADE
iptables -P FORWARD ACCEPT

echo "Configuration container init done"
