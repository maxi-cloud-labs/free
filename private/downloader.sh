#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for downloader [-h -s -v VERSION]"
echo "h:	Print this usage and exit"
echo "s:	Skip md5sum check"
echo "v VERSION:	Download VERSION"
exit 0
}

BASEURL=https://github.com/mAxIcloud/Free
VERSION=LATEST
SKIP=0
while getopts hsv: opt; do
	case "$opt" in
		h) helper;;
		s) SKIP=1;;
		v) VERSION=${OPTARG};;
		*) ;;
	esac
done

rm -f maxi.cloud.$VERSION.os
LIST=$(wget -qO- $BASEURL/releases/download/$VERSION/files.txt)
echo "$LIST" | while read -r MD5SUM FILE; do
	wget -q --show-progress --progress=bar:force:noscroll $BASEURL/releases/download/$VERSION/$FILE
	if [ $SKIP = 0 ]; then
		MD5SUMDOWNLOADED=$(md5sum $FILE | cut -d " " -f 1)
		if [ "$MD5SUM" != "$MD5SUMDOWNLOADED" ]; then
			echo "An error has occured while downloading $FILE"
			exit 0
		fi
	fi
	cat $FILE >> maxi.cloud.$VERSION.os
done < $LIST
