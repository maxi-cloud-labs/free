#!/bin/sh

wget -q --show-progress --progress=bar:force:noscroll -O /usr/local/bin/acme.sh https://raw.githubusercontent.com/acmesh-official/acme.sh/refs/tags/3.1.1/acme.sh
chmod a+x /usr/local/bin/acme.sh
