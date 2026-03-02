#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://download.rethinkdb.com/repository/debian-bookworm/pool/r/rethinkdb/rethinkdb_2.4.4~0bookworm_arm64.deb
dpkg -i rethinkdb*.deb
