#!/bin/sh

if [ "$(id -u)" = "0" ]; then
	echo "You should not be root"
	exit 0
fi

echo "#Reset zigbee2mqtt##################"
systemctl stop zigbee2mqtt.service
rm -rf /disk/admin/modules/zigbee2mqtt
mkdir /disk/admin/modules/zigbee2mqtt
ln -sf /var/log/zigbee2mqtt /disk/admin/modules/zigbee2mqtt/log
cat > /disk/admin/modules/zigbee2mqtt/configuration.yaml << EOF
version: 4
mqtt:
  base_topic: zigbee2mqtt
  server: mqtt://localhost:1883
serial:
  port: /dev/tty_zigbee
  adapter: zstack
  baudrate: 115200
  rtscts: false
advanced:
  log_level: info
  channel: 11
  network_key:
    - 29
    - 88
    - 181
    - 61
    - 73
    - 73
    - 141
    - 233
    - 254
    - 26
    - 63
    - 71
    - 231
    - 22
    - 42
    - 66
  pan_id: 48862
  ext_pan_id:
    - 191
    - 34
    - 159
    - 165
    - 151
    - 131
    - 177
    - 175
frontend:
  enabled: true
  port: 8095
  host: 127.0.0.1
homeassistant:
  enabled: true
EOF
systemctl start zigbee2mqtt.service
systemctl enable zigbee2mqtt.service

echo "{ \"a\":\"status\", \"module\":\"$(basename $0 .sh)\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
