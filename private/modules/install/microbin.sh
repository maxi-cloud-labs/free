#!/bin/sh

cd /usr/local/modules/microbin
sync
echo 3 > /proc/sys/vm/drop_caches
cargo build --release
cp target/release/microbin /usr/local/bin/
rm -rf /usr/local/modules/microbin/target/
