#!/bin/sh

apt-get -y install libcgi-pm-perl libemail-mime-perl libemail-sender-perl libemail-address-perl libmath-random-isaac-perl liblist-moreutils-perl libjson-xs-perl libdatetime-timezone-perl libdbi-perl libtest-taint-perl libdbd-sqlite3-perl libencode-detect-perl libio-stringy-perl libxml-twig-perl libwww-perl libtext-multimarkdown-perl liburi-db-perl libfile-copy-recursive-perl libfile-which-perl libpod-pom-view-restructured-perl libhtml-scrubber-perl libemail-reply-perl libhtml-formattext-withlinks-perl libjson-rpc-perl libcache-memcached-fast-perl libchart-perl libgd-perl libgd-graph-perl libgd-text-perl libtemplate-plugin-gd-perl libmoox-strictconstructor-perl libtype-tiny-perl libdaemon-generic-perl libtheschwartz-perl libapache2-mod-perl2 libdbd-pg-perl libfile-mimeinfo-perl libsoap-lite-perl libxmlrpc-lite-perl
cd /usr/local/modules/bugzilla
ln -sf /disk/admin/modules/bugzilla/data
ln -sf /disk/admin/modules/bugzilla/localconfig
cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://cpan.metacpan.org/authors/id/A/AB/ABW/Template-Toolkit-3.101.tar.gz
tar -xzf Template-Toolkit-3.101.tar.gz
cd Template-Toolkit-3.101
yes | perl Makefile.PL
make
make install
