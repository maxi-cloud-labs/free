#!/bin/sh

install() {
	cd /home/ai/build
	wget -q --show-progress --progress=bar:force:noscroll https://www.python.org/ftp/python/$1/Python-$1.tar.xz
	tar -xpf Python-$1.tar.xz
	cd Python-$1
	./configure --enable-optimizations
	make -j 2
	make altinstall
}

install 3.11.14
install 3.12.12
