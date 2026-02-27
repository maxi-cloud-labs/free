#!/bin/sh

cd /usr/local/modules/librechat
npm install
npm install @smithy/signature-v4 @smithy/eventstream-codec
sync
echo 3 > /proc/sys/vm/drop_caches
npm run frontend
RET=$?
if [ $RET = 0 ]; then
	echo "**CLEANING**"
	npm prune --production
fi
sync
echo 3 > /proc/sys/vm/drop_caches
ln -sf /disk/admin/modules/librechat/.env
ln -sf /disk/admin/modules/librechat/logs
ln -sf /disk/admin/modules/librechat/librechat.yaml
ln -sf /disk/admin/modules/librechat/logs api/
