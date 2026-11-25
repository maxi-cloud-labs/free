#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for docs [-c -h -r -t]"
echo "c:	Clean"
echo "h:	Print this usage and exit"
echo "r:	Rebuild table"
echo "t:	Pop up website locally in Google Chrome"
exit 0
}

CLEAN=0
TABLE=0
TEST=0
while getopts chrt opt; do
	case "$opt" in
		c) CLEAN=1;;
		h) helper;;
		r) TABLE=1;;
		t) TEST=1;;
	esac
done


PP=`dirname $0`
cd $PP

if [ $CLEAN = 1 -o ! -d /tmp/docsify ]; then
	PP=`pwd`
	cd /tmp
	rm -rf docsify
	git clone https://github.com/docsifyjs/docsify
	cd docsify
	git checkout v5.1.0
	npm install
	npm run build
	cd $PP
fi

if [ $TABLE = 1 ]; then
	php ../private/modules-update.php
fi
rm -rf web
mkdir web
cp /tmp/docsify/dist/docsify.min.js /tmp/docsify/dist/plugins/zoom-image.min.js /tmp/docsify/dist/plugins/search.min.js /tmp/docsify/dist/themes/core.css /tmp/docsify/dist/themes/addons/vue.css /tmp/docsify/dist/themes/addons/core-dark.css web
cp index.html tailwindcss-4.js favicon.ico web
cp ../README.md web
cp  ../client/src/assets/modulesmeta.json web/modules_latest.json
sed -i 's/|Module|Title|Description|⭐|Type|Category|/<TABLE_MODULES>/' web/README.md
sed -i '/^|.*/d' web/README.md
sed -i '/<TABLE_MODULES>/ {
r ../build/README-modules.md
d
}' web/README.md
mv web/README.md web/home.md
if [ $TEST = 1 ]; then
	ln -sf ../modules.html web
	ln -sf ../modules2.html web
	ln -sf ../../private/modules/icons web/icons_
	for md in `ls *.md`; do ln -sf ../$md web; done
else
	cp modules.html web
	cp modules2.html web
	cp -a ../private/modules/icons/ web/icons_
	cp *.md web
fi

if [ $TEST = 1 ]; then
	cd web
	(sleep 1 && google-chrome --incognito http://localhost:8102) &
	php -S localhost:8102
fi
