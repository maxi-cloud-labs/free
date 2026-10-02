#!/bin/sh

cd /home/ai/build
 wget -nv --show-progress --progress=bar:force:noscroll https://github.com/firecracker-microvm/firecracker/releases/download/v1.17.0/firecracker-v1.17.0-aarch64.tgz
tar -xpf firecracker-*.tgz
mkdir /usr/local/modules/firecracker
mv release-*/firecracker*aarch64 /usr/local/modules/firecracker/firecracker

cd /home/ai/build
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.18.54.tar.xz
tar -xpf linux-6.18.54.tar.xz
 wget -nv --show-progress --progress=bar:force:noscroll https://raw.githubusercontent.com/firecracker-microvm/firecracker/refs/heads/main/resources/guest_configs/microvm-kernel-ci-aarch64-6.18.config
cat > linux-6.18.54.patch << EOF
--- microvm-kernel-ci-aarch64-6.18.config	2026-09-26 10:12:58.887297188 -0700
+++ microvm-kernel-ci-aarch64-6.18.config	2026-09-25 16:55:46.000000000 -0700
@@ -1,25 +1,31 @@
 #
 # Automatically generated file; DO NOT EDIT.
-# Linux/arm64 6.18.39-79.141.amzn2023.aarch64.microvm Kernel Configuration
+# Linux/arm64 6.18.54 Kernel Configuration
 #
-CONFIG_CC_VERSION_TEXT="gcc (GCC) 11.5.0 20240719 (Red Hat 11.5.0-5)"
+CONFIG_CC_VERSION_TEXT="gcc (Debian 14.2.0-19) 14.2.0"
 CONFIG_CC_IS_GCC=y
-CONFIG_GCC_VERSION=110500
+CONFIG_GCC_VERSION=140200
 CONFIG_CLANG_VERSION=0
 CONFIG_AS_IS_GNU=y
-CONFIG_AS_VERSION=24100
+CONFIG_AS_VERSION=24400
 CONFIG_LD_IS_BFD=y
-CONFIG_LD_VERSION=24100
+CONFIG_LD_VERSION=24400
 CONFIG_LLD_VERSION=0
-CONFIG_RUSTC_VERSION=0
-CONFIG_RUSTC_LLVM_VERSION=0
+CONFIG_RUSTC_VERSION=109000
+CONFIG_RUSTC_LLVM_VERSION=190107
 CONFIG_CC_CAN_LINK=y
 CONFIG_CC_HAS_ASM_GOTO_OUTPUT=y
 CONFIG_CC_HAS_ASM_GOTO_TIED_OUTPUT=y
+CONFIG_TOOLS_SUPPORT_RELR=y
 CONFIG_CC_HAS_ASM_INLINE=y
+CONFIG_CC_HAS_ASSUME=y
 CONFIG_CC_HAS_NO_PROFILE_FN_ATTR=y
 CONFIG_LD_CAN_USE_KEEP_IN_OVERLAY=y
-CONFIG_PAHOLE_VERSION=129
+CONFIG_RUSTC_HAS_COERCE_POINTEE=y
+CONFIG_RUSTC_HAS_SPAN_FILE=y
+CONFIG_RUSTC_HAS_UNNECESSARY_TRANSMUTES=y
+CONFIG_RUSTC_HAS_FILE_WITH_NUL=y
+CONFIG_PAHOLE_VERSION=130
 CONFIG_IRQ_WORK=y
 CONFIG_BUILDTIME_TABLE_SORT=y
 CONFIG_THREAD_INFO_IN_TASK=y
@@ -27,7 +33,6 @@
 #
 # General setup
 #
-CONFIG_MICROVM=y
 CONFIG_INIT_ENV_ARG_LIMIT=32
 # CONFIG_COMPILE_TEST is not set
 # CONFIG_WERROR is not set
@@ -306,8 +311,6 @@
 CONFIG_GENERIC_HWEIGHT=y
 CONFIG_GENERIC_CSUM=y
 CONFIG_GENERIC_CALIBRATE_DELAY=y
-CONFIG_ARCH_MEMORY_PROBE=y
-# CONFIG_ARCH_MEMORY_REMOVE is not set
 CONFIG_SMP=y
 CONFIG_KERNEL_MODE_NEON=y
 CONFIG_FIX_EARLYCON_MEM=y
@@ -456,6 +459,7 @@
 CONFIG_SCHED_HRTICK=y
 CONFIG_ARCH_SPARSEMEM_ENABLE=y
 CONFIG_HW_PERF_EVENTS=y
+CONFIG_CC_HAVE_SHADOW_CALL_STACK=y
 CONFIG_PARAVIRT=y
 CONFIG_PARAVIRT_TIME_ACCOUNTING=y
 CONFIG_ARCH_SUPPORTS_KEXEC=y
@@ -746,6 +750,8 @@
 CONFIG_HAVE_STACKPROTECTOR=y
 CONFIG_STACKPROTECTOR=y
 CONFIG_STACKPROTECTOR_STRONG=y
+CONFIG_ARCH_SUPPORTS_SHADOW_CALL_STACK=y
+# CONFIG_SHADOW_CALL_STACK is not set
 CONFIG_ARCH_SUPPORTS_LTO_CLANG=y
 CONFIG_ARCH_SUPPORTS_LTO_CLANG_THIN=y
 CONFIG_LTO_NONE=y
@@ -796,6 +802,7 @@
 CONFIG_ARCH_USE_MEMREMAP_PROT=y
 # CONFIG_LOCK_EVENT_COUNTS is not set
 CONFIG_ARCH_HAS_RELR=y
+CONFIG_RELR=y
 CONFIG_ARCH_HAS_MEM_ENCRYPT=y
 CONFIG_ARCH_HAS_CC_PLATFORM=y
 CONFIG_HAVE_PREEMPT_DYNAMIC=y
@@ -817,6 +824,9 @@
 CONFIG_HAVE_GCC_PLUGINS=y
 CONFIG_FUNCTION_ALIGNMENT_4B=y
 CONFIG_FUNCTION_ALIGNMENT=4
+CONFIG_CC_HAS_MIN_FUNCTION_ALIGNMENT=y
+CONFIG_CC_HAS_SANE_FUNCTION_ALIGNMENT=y
+CONFIG_HAVE_ARCH_GET_SECUREBOOT=y
 # end of General architecture-dependent options
 
 CONFIG_RT_MUTEXES=y
@@ -1131,8 +1141,6 @@
 #
 # Networking options
 #
-# CONFIG_LUSTRE_LIBCFS is not set
-# CONFIG_LUSTRE_LNET is not set
 CONFIG_PACKET=y
 CONFIG_PACKET_DIAG=y
 # CONFIG_INET_PSP is not set
@@ -1912,7 +1920,6 @@
 # CONFIG_DW_XDATA_PCIE is not set
 # CONFIG_PCI_ENDPOINT_TEST is not set
 # CONFIG_XILINX_SDFEC is not set
-CONFIG_SYSGENID=y
 # CONFIG_OPEN_DICE is not set
 # CONFIG_NTSYNC is not set
 # CONFIG_VCPU_STALL_DETECTOR is not set
@@ -2210,7 +2217,6 @@
 # CONFIG_HW_RANDOM_XIPHERA is not set
 CONFIG_HW_RANDOM_ARM_SMCCC_TRNG=y
 CONFIG_HW_RANDOM_CN10K=y
-# CONFIG_HW_RANDOM_GRAVITON is not set
 # CONFIG_APPLICOM is not set
 # CONFIG_DEVMEM is not set
 CONFIG_DEVPORT=y
@@ -2888,7 +2894,6 @@
 # CONFIG_PECI is not set
 # CONFIG_HTE is not set
 # CONFIG_CDX_BUS is not set
-# CONFIG_AMAZON_DRIVER_UPDATES is not set
 # end of Device Drivers
 
 #
@@ -3187,7 +3192,12 @@
 #
 # Memory initialization
 #
+CONFIG_CC_HAS_AUTO_VAR_INIT_PATTERN=y
+CONFIG_CC_HAS_AUTO_VAR_INIT_ZERO_BARE=y
+CONFIG_CC_HAS_AUTO_VAR_INIT_ZERO=y
 CONFIG_INIT_STACK_NONE=y
+# CONFIG_INIT_STACK_ALL_PATTERN is not set
+# CONFIG_INIT_STACK_ALL_ZERO is not set
 # CONFIG_INIT_ON_ALLOC_DEFAULT_ON is not set
 # CONFIG_INIT_ON_FREE_DEFAULT_ON is not set
 CONFIG_CC_HAS_ZERO_CALL_USED_REGS=y
@@ -3218,9 +3228,6 @@
 #
 # Crypto core or helper
 #
-CONFIG_CRYPTO_FIPS=y
-CONFIG_CRYPTO_FIPS_NAME="Amazon Linux 2023 Kernel Cryptographic API"
-# CONFIG_CRYPTO_FIPS_CUSTOM_VERSION is not set
 CONFIG_CRYPTO_ALGAPI=y
 CONFIG_CRYPTO_ALGAPI2=y
 CONFIG_CRYPTO_AEAD=y
@@ -3356,14 +3363,9 @@
 CONFIG_CRYPTO_DRBG_CTR=y
 CONFIG_CRYPTO_DRBG=y
 CONFIG_CRYPTO_JITTERENTROPY=y
-CONFIG_CRYPTO_JITTERENTROPY_MEMSIZE_2=y
-# CONFIG_CRYPTO_JITTERENTROPY_MEMSIZE_128 is not set
-# CONFIG_CRYPTO_JITTERENTROPY_MEMSIZE_1024 is not set
-# CONFIG_CRYPTO_JITTERENTROPY_MEMSIZE_8192 is not set
 CONFIG_CRYPTO_JITTERENTROPY_MEMORY_BLOCKS=64
 CONFIG_CRYPTO_JITTERENTROPY_MEMORY_BLOCKSIZE=32
 CONFIG_CRYPTO_JITTERENTROPY_OSR=1
-# CONFIG_CRYPTO_JITTERENTROPY_TESTINTERFACE is not set
 # end of Random number generation
 
 #
@@ -3399,9 +3401,6 @@
 # end of Accelerated Cryptographic Algorithms for CPU (arm64)
 
 # CONFIG_CRYPTO_HW is not set
-CONFIG_CRYPTO_FIPS140_EXTMOD=y
-CONFIG_CRYPTO_FIPS140_HMAC_KEY="Sphinx of black quartz, judge my vow"
-# CONFIG_CRYPTO_FIPS140_EXTMOD_SOURCE is not set
 CONFIG_ASYMMETRIC_KEY_TYPE=y
 CONFIG_ASYMMETRIC_PUBLIC_KEY_SUBTYPE=y
 CONFIG_X509_CERTIFICATE_PARSER=y
@@ -3502,7 +3501,6 @@
 CONFIG_HAS_DMA=y
 CONFIG_DMA_OPS_HELPERS=y
 CONFIG_NEED_SG_DMA_FLAGS=y
-# CONFIG_DMA_PAGE_TOUCHING is not set
 CONFIG_NEED_SG_DMA_LENGTH=y
 CONFIG_NEED_DMA_MAP_STATE=y
 CONFIG_ARCH_DMA_ADDR_T_64BIT=y
@@ -3784,6 +3782,7 @@
 # CONFIG_NOTIFIER_ERROR_INJECTION is not set
 # CONFIG_FAULT_INJECTION is not set
 CONFIG_ARCH_HAS_KCOV=y
+# CONFIG_KCOV is not set
 # CONFIG_RUNTIME_TESTING_MENU is not set
 CONFIG_ARCH_USE_MEMTEST=y
 # CONFIG_MEMTEST is not set
EOF
patch -p0 < linux-6.18.54.patch
cd linux-6.18.54
mv ../microvm-kernel-ci-aarch64-6.18.config .config
make -j 4 Image
cd ..
cp linux-6.18.54/arch/arm64/boot/Image /usr/local/modules/firecracker

cd /home/ai/build
rm -rf initramfs
mkdir -p initramfs/bin
 wget -nv --show-progress --progress=bar:force:noscroll http://ftp.us.debian.org/debian/pool/main/b/busybox/busybox-static_1.37.0-6+b9_armhf.deb
rm -rf extracted
dpkg-deb -x busybox-static_1.37.0-6+b9_armhf.deb extracted
cp ./extracted/usr/bin/busybox initramfs/bin/
chmod +x initramfs/bin/busybox
rm -rf extracted
cd initramfs
for cmd in sh mount mkdir base64 switch_root; do
	ln -s /bin/busybox bin/$cmd
done
cat > init << 'EOF'
#!/bin/sh

set -e
mkdir -p /dev /proc /sys
mount -t devtmpfs devtmpfs /dev
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mkdir -p /mnt
mount -t ext4 /dev/vda /mnt
mkdir -p /mnt/lower1 /mnt/lower2 /mnt/upper /mnt/work /mnt/final
mount -t squashfs -o ro /dev/vdb /mnt/lower1
mount -t squashfs -o ro /dev/vdc /mnt/lower2
mount -t overlay none /mnt/final -o lowerdir=/mnt/lower1:/mnt/lower2,upperdir=/mnt/upper,workdir=/mnt/work,index=on,metacopy=on
mkdir -p /mnt/final/proc /mnt/final/sys /mnt/final/dev
mkdir -p /mnt/final/etc
ln -sf /proc/self/mounts /mnt/final/etc/mtab
if [ "$#" -gt 0 ]; then
	CONTAINER_RUN=$(printf '%s' "$1" | base64 -d)
	exec switch_root /mnt/final /bin/sh -c "$CONTAINER_RUN"
else
	exec switch_root /mnt/final /sbin/agetty --autologin root --noclear console linux
fi
EOF
chmod +x init
rm ../initramfs.cpio.gz 2>/dev/null
find . | cpio -H newc -o > ../initramfs.cpio
gzip ../initramfs.cpio
cd ..
rm -rf initramfs
mv initramfs.cpio.gz /usr/local/modules/firecracker
