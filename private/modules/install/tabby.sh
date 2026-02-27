#!/bin/sh

apt-get -y install protobuf-compiler libopenblas-dev graphviz
cd /usr/local/modules/tabby
sync
echo 3 > /proc/sys/vm/drop_caches
cargo build --release
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	cp /usr/local/modules/tabby/target/release/llama-server /usr/local/bin
	cp /usr/local/modules/tabby/target/release/tabby /usr/local/bin
	cd /home/ai
	rm -rf /usr/local/modules/tabby/
fi
sync
echo 3 > /proc/sys/vm/drop_caches
