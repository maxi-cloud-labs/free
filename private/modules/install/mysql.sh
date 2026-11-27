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
	apt-get -y install mysql-server-8.0
	apt-get -y install mysql-server
elif [ $OS = "pios" ]; then
	apt-get -y install libevent-pthreads-2.1-7 libmecab2
	cd /home/ai/build
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/liba/libaio/libaio1t64_0.3.113-10_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/i/icu/libicu74_74.2-1ubuntu3.1_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/p/protobuf/libprotobuf-lite32t64_3.21.12-17_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/m/mysql-defaults/mysql-common_5.8+1.1.1ubuntu2_all.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/m/mysql-8.0/mysql-server-core-8.0_8.0.46-0ubuntu0.24.04.5_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/m/mysql-8.0/mysql-server-8.0_8.0.46-0ubuntu0.24.04.5_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/m/mysql-8.0/mysql-client-core-8.0_8.0.46-0ubuntu0.24.04.5_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/m/mysql-8.0/mysql-client-8.0_8.0.46-0ubuntu0.24.04.5_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/m/mysql-8.0/libmysqlclient-dev_8.0.46-0ubuntu0.24.04.5_arm64.deb
	 wget -nv --show-progress --progress=bar:force:noscroll https://ports.ubuntu.com/pool/main/m/mysql-8.0/libmysqlclient21_8.0.46-0ubuntu0.24.04.5_arm64.deb
	dpkg -i libaio1t64* libicu74* libprotobuf-lite32t64* mysql-common*
	dpkg -i mysql-client* mysql-server*
	dpkg -i libmysqlclient*
	cd ..
	apt-mark hold mariadb-common
fi
