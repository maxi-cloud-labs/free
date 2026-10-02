#!/bin/sh

if [ "$(id -u)" != "0" ]; then
	echo "You need to be root"
	exit 0
fi

MODULE=$1
CONTAINER_ID=$(jq -r ".ollama.containerID" /usr/local/modules/_core_/web/assets/modulesdefault.json)
CONTAINER_RUN=$(jq -r ".ollama.containerRun" /usr/local/modules/_core_/web/assets/modulesdefault.json)
CONTAINER_RUN_B64="-- $(printf '%s' "$CONTAINER_RUN" | base64 -w0)"
echo "#Container reset for $MODULE ##################"
rm -rf /disk/admin/modules/firecracker/$MODULE
mkdir -p /disk/admin/modules/firecracker/$MODULE
dd if=/dev/zero of=/disk/admin/modules/firecracker/$MODULE/storage.ext4 bs=1M count=2048
mkfs.ext4 /disk/admin/modules/firecracker/$MODULE/storage.ext4
cat > /disk/admin/modules/firecracker/$MODULE/vm.json << EOF
{
	"boot-source": {
		"kernel_image_path": "/usr/local/modules/firecracker/Image",
		"boot_args": "console=ttyS0 reboot=k panic=1 pci=off ip=169.254.10.$CONTAINER_ID::169.254.10.254:255.255.255.0::eth0:off $CONTAINER_RUN_B64",
		"initrd_path": "/usr/local/modules/firecracker/initramfs.cpio.gz"
	},
	"drives": [ {
		"drive_id": "rw_storage",
		"path_on_host": "/disk/admin/modules/firecracker/$MODULE/storage.ext4",
		"is_root_device": false,
		"is_read_only": false
	}, {
		"drive_id": "rootfs",
		"path_on_host": "/disk/fs/_os_.img",
		"is_root_device": false,
		"is_read_only": false
	}, {
		"drive_id": "app",
		"path_on_host": "/disk/fs/$MODULE.img",
		"is_root_device": false,
		"is_read_only": true
	} ],
	"network-interfaces": [ {
		"iface_id": "net0",
		"host_dev_name": "firecracker0"
	} ],
	"machine-config": {
		"vcpu_count": 1,
		"mem_size_mib": 1024
	}
}
EOF
chown -R admin:admin /disk/admin/modules/firecracker/$MODULE
/usr/local/modules/firecracker/firecracker --api-sock /disk/admin/modules/firecracker/$MODULE/firecracker.socket --config-file /disk/admin/modules/firecracker/$MODULE/vm.json

echo "{ \"a\":\"status\", \"module\":\"$MODULE\", \"state\":\"finish\" }" | websocat -1 ws://localhost:8094
