#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset homeassistant##################"
systemctl stop homeassistant.service
rm -rf /disk/admin/modules/homeassistant
mkdir /disk/admin/modules/homeassistant
cat > /disk/admin/modules/homeassistant/configuration.yaml <<EOF
default_config:

frontend:
  themes: !include_dir_merge_named themes

http:
  use_x_forwarded_for: true
  trusted_proxies:
    - ::1
EOF
systemctl start homeassistant.service
systemctl enable homeassistant.service

if [ -z $RESET_SYNC ]; then
	/usr/local/modules/_core_/reset/homeassistant-user.sh &
else
	/usr/local/modules/_core_/reset/homeassistant-user.sh
fi
