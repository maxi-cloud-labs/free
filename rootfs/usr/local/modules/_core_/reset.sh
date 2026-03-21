#!/bin/sh

helper() {
echo "*******************************************************"
echo "Usage for setup [-d -h -u u -s 0-1 -t t] name"
echo "d:	Do dependency"
echo "h:	Print this usage and exit"
echo "u u:	Launch as user 0:admin, 1:root, -1:read from json (default)"
echo "s 0-1:	Enable or disable admin in sudoers"
echo "t t:	Set time zone"
exit 0
}

if [ "m`id -u`" != "m0" ]; then
	echo "You need to be root"
	exit 0
fi

USER=-1
SUDOERS=-1
TIMEZONE=
DEPENDENCIES=0
while getopts dhu:s:t: opt
do
	case "$opt" in
		d) DEPENDENCIES=1;;
		h) helper;;
		u) USER=$OPTARG;;
		s) SUDOERS=$OPTARG;;
		t) TIMEZONE=$OPTARG;;
	esac
done

cd `dirname $0`
PP=`pwd`

if [ ! -z $TIMEZONE ]; then
	if timedatectl list-timezones | grep -qx "$TIMEZONE"; then
		timedatectl set-timezone -- "$TIMEZONE"
	fi
	exit
fi

if [ $SUDOERS != -1 ]; then
	if [ $SUDOERS = 1 ]; then
		adduser admin sudo
	else
		deluser admin sudo
	fi
	exit
fi

shift $((OPTIND -1))
NAME=$1
if [ $DEPENDENCIES = 1 ]; then
	LIST2=`jq -r ".$NAME.setupDependencies | join(\" \")" $PP/web/assets/modulesdefault.json 2> /dev/null`
	for tt in $LIST2; do
		ALREADYDONE=`jq -r ".$tt.setupDone" /disk/admin/modules/_config_/_modules_.json 2> /dev/null`
		if [ "$ALREADYDONE" != "true" ]; then
			$PP/reset.sh -d $tt
		fi
	done
fi
if [ $USER = -1 ]; then
	USER=`jq -r ".\"$NAME\".setupRoot | if . == true then 1 else 0 end" $PP/web/assets/modulesdefault.json 2> /dev/null`
fi
if [ ! -f $PP/reset/$NAME.sh ]; then
	echo "#Doing nothing for $NAME##################"
else
	export RESET_SYNC=1
	if [ $USER = 1 ]; then
		$PP/reset/$NAME.sh
	else
		su admin -c "$PP/reset/$NAME.sh"
	fi
fi
