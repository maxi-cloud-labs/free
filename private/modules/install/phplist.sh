#!/bin/sh

cd /usr/local/modules
 wget -nv --show-progress --progress=bar:force:noscroll https://versaweb.dl.sourceforge.net/project/phplist/phplist/3.6.16/phplist-3.6.16.tgz
tar -xpf phplist-*
rm phplist-*.tgz
mv phplist-* phplist
