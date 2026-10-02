#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

MODULE=$1
echo "#Container suspend/resume for $MODULE ##################"
curl --unix-socket /disk/admin/modules/firecracker/$MODULE/firecracker.socket -X PATCH "http://localhost/vm" -H "Content-Type: application/json" -d "{ \"state\":\"Paused\" }"

curl --unix-socket /disk/admin/modules/firecracker/$MODULE/firecracker.socket -X PUT "http://localhost/snapshot/create" -H "Content-Type: application/json" -d "{  \"snapshot_type\": \"Full\", \"snapshot_path\":\"/disk/admin/modules/firecracker/$MODULE/firecracker.snapshot\", \"mem_file_path\":\"/disk/admin/modules/firecracker/$MODULE/firecracker.ram\" }"

pkill -f "api-sock /disk/admin/modules/firecracker/$MODULE/firecracker.socket"
rm -f /disk/admin/modules/firecracker/$MODULE/firecracker.socket
echo "{ \"a\":\"status\", \"module\":\"$MODULE\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094

echo suspended
read l


/usr/local/modules/firecracker/firecracker --api-sock /disk/admin/modules/firecracker/$MODULE/firecracker.socket &
sleep 1

curl --unix-socket /disk/admin/modules/firecracker/$MODULE/firecracker.socket -X PUT "http://localhost/snapshot/load" -H "Content-Type: application/json" -d "{ \"snapshot_path\":\"/disk/admin/modules/firecracker/$MODULE/firecracker.snapshot\", \"mem_file_path\":\"/disk/admin/modules/firecracker/$MODULE/firecracker.ram\", \"enable_diff_snapshots\": false }"

sleep 1

curl --unix-socket /disk/admin/modules/firecracker/$MODULE/firecracker.socket -X PATCH "http://localhost/vm" -H "Content-Type: application/json" -d "{ \"state\":\"Resumed\" }"

echo "{ \"a\":\"status\", \"module\":\"$MODULE\", \"state\":\"started\" }" | websocat -1 ws://localhost:8094
