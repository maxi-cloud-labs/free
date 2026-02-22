#!/bin/sh

cd /usr/local/modules/piped
npm install
sync
echo 3 > /proc/sys/vm/drop_caches
NODE_OPTIONS="--max-old-space-size=4096" npm run build
find dist -type f -exec sed -i -e 's@https://pipedapi.kavin.rocks@" + window.location.origin + "/_api_@g'  {} \;
find dist -type f -exec sed -i -e 's@https://pipedproxy.kavin.rocks@" + window.location.origin + "/_proxy_@g' {} \;

cd pipedbackend
sync
echo 3 > /proc/sys/vm/drop_caches
./gradlew shadowJar
sync
echo 3 > /proc/sys/vm/drop_caches

cd ../pipedproxy
apt-get -y install -t trixie-backports rustc
cargo build --release
sync
echo 3 > /proc/sys/vm/drop_caches
cp /usr/local/modules/piped/pipedproxy/target/release/piped-proxy /usr/local/bin
rm -rf /usr/local/modules/piped/pipedproxy/target/
