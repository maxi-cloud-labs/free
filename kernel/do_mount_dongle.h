#define EXT2FS_SHA512_LENGTH 64
#include "sha512.h"

#define SHA512_LENGTH 64
#define EXT2FS_KEY_TYPE_LOGON "logon"
#define EXT2FS_KEY_DESC_PREFIX "ext4:"
#define EXT2FS_KEY_DESC_PREFIX_SIZE 5
#define EXT4_IOC_SET_ENCRYPTION_POLICY _IOR('f', 19, struct ext4_encryption_policy)
#define KEY_SPEC_SESSION_KEYRING -3
#define KEYCTL_GET_KEYRING_ID 0
#define EXT4_MAX_PASSPHRASE_SIZE 1024
#define EXT4_MAX_SALT_SIZE 256
#define EXT4_PBKDF2_ITERATIONS 0xFFFF
#define EXT4_KEY_DESCRIPTOR_SIZE 8
#define EXT4_ENCRYPTION_MODE_AES_256_XTS 1
#define EXT4_ENCRYPTION_MODE_AES_256_CTS 4
#define EXT4_MAX_KEY_SIZE 64
#define EXT4_KEY_REF_STR_BUF_SIZE ((EXT4_KEY_DESCRIPTOR_SIZE * 2) + 1)

typedef __s32 key_serial_t;

struct ext4_encryption_policy {
  char version;
  char contents_encryption_mode;
  char filenames_encryption_mode;
  char flags;
  char master_key_descriptor[EXT4_KEY_DESCRIPTOR_SIZE];
};

struct ext4_encryption_key {
	__u32 mode;
	char raw[EXT4_MAX_KEY_SIZE];
	__u32 size;
};

struct salt {
	unsigned char *salt;
	char key_ref_str[EXT4_KEY_REF_STR_BUF_SIZE];
	unsigned char key_desc[EXT4_KEY_DESCRIPTOR_SIZE];
	unsigned char key[EXT4_MAX_KEY_SIZE];
	size_t salt_len;
};

static const unsigned char *hexchars = (const unsigned char *) "0123456789abcdef";
static const size_t hexchars_size = 16;

static int hex2byte(const char *hex, size_t hex_size, unsigned char *bytes, size_t bytes_size) {
	size_t x;
	unsigned char *h, *l;

	if (hex_size % 2)
		return -EINVAL;
	for (x = 0; x < hex_size; x += 2) {
		h = memchr(hexchars, hex[x], hexchars_size);
		if (!h)
			return -EINVAL;
		l = memchr(hexchars, hex[x + 1], hexchars_size);
		if (!l)
			return -EINVAL;
		if ((x >> 1) >= bytes_size)
			return -EINVAL;
		bytes[x >> 1] = (((unsigned char)(h - hexchars) << 4) +
			(unsigned char)(l - hexchars));
	}
	return 0;
}

static void pbkdf2_sha512(const char *passphrase, struct salt *salt, unsigned int count, unsigned char derived_key[EXT4_MAX_KEY_SIZE]) {
	size_t passphrase_size = strlen(passphrase);
	unsigned char buf[SHA512_LENGTH + EXT4_MAX_PASSPHRASE_SIZE] = {0};
	unsigned char tempbuf[SHA512_LENGTH] = {0};
	char final[SHA512_LENGTH] = {0};
	unsigned char saltbuf[EXT4_MAX_SALT_SIZE + EXT4_MAX_PASSPHRASE_SIZE] = {0};
	int actual_buf_len = SHA512_LENGTH + passphrase_size;
	int actual_saltbuf_len = EXT4_MAX_SALT_SIZE + passphrase_size;
	unsigned int x, y;
	__u32 *final_u32 = (__u32 *)final;
	__u32 *temp_u32 = (__u32 *)tempbuf;

#if 0
	if (passphrase_size > EXT4_MAX_PASSPHRASE_SIZE) {
		printf("Passphrase size is %zd; max is %d.\n", passphrase_size,
		       EXT4_MAX_PASSPHRASE_SIZE);
		exit(1);
	}
	if (salt->salt_len > EXT4_MAX_SALT_SIZE) {
		printf("Salt size is %zd; max is %d.\n", salt->salt_len,
		       EXT4_MAX_SALT_SIZE);
		exit(1);
	}
	assert(EXT4_MAX_KEY_SIZE <= SHA512_LENGTH);
#endif

	memcpy(saltbuf, salt->salt, salt->salt_len);
	memcpy(&saltbuf[EXT4_MAX_SALT_SIZE], passphrase, passphrase_size);

	memcpy(&buf[SHA512_LENGTH], passphrase, passphrase_size);

	for (x = 0; x < count; ++x) {
		if (x == 0) {
			ext2fs_sha512(saltbuf, actual_saltbuf_len, tempbuf);
		} else {
			/*
			 * buf: [previous hash || passphrase]
			 */
			memcpy(buf, tempbuf, SHA512_LENGTH);
			ext2fs_sha512(buf, actual_buf_len, tempbuf);
		}
		for (y = 0; y < (sizeof(final) / sizeof(*final_u32)); ++y)
			final_u32[y] = final_u32[y] ^ temp_u32[y];
	}
	memcpy(derived_key, final, EXT4_MAX_KEY_SIZE);
}

static void generate_key_ref_str(struct salt *salt) {
	unsigned char key_ref1[SHA512_LENGTH];
	unsigned char key_ref2[SHA512_LENGTH];
	int x;

	ext2fs_sha512(salt->key, EXT4_MAX_KEY_SIZE, key_ref1);
	ext2fs_sha512(key_ref1, SHA512_LENGTH, key_ref2);
	memcpy(salt->key_desc, key_ref2, EXT4_KEY_DESCRIPTOR_SIZE);
	for (x = 0; x < EXT4_KEY_DESCRIPTOR_SIZE; ++x)
		sprintf(&salt->key_ref_str[x * 2], "%02x", salt->key_desc[x]);
	salt->key_ref_str[EXT4_KEY_REF_STR_BUF_SIZE - 1] = '\0';
}

#include "password.h"
static int crypt_folder(char *path) {
	struct salt salt_;
	salt_.salt_len = 16;
	unsigned char s[16];
	hex2byte(SALT, 32, s, 16);
	salt_.salt = s;
	struct salt *salt = &salt_;
	pbkdf2_sha512(PASSPHRASE, salt, EXT4_PBKDF2_ITERATIONS, salt->key);
	generate_key_ref_str(salt);

	key_serial_t keyring_id = sys_keyctl(KEYCTL_GET_KEYRING_ID, KEY_SPEC_SESSION_KEYRING, 0, 0, 0);
	if (keyring_id < 0) {
		printk("Dongle Mount Error: failed to get id\n");
		return -1;
	}
	struct ext4_encryption_key key;
	key.mode = 1;
	key.size = 64;
	memcpy(key.raw, salt->key, EXT4_MAX_KEY_SIZE);
	char key_ref_full[EXT2FS_KEY_DESC_PREFIX_SIZE + EXT4_KEY_REF_STR_BUF_SIZE];
	strcpy(key_ref_full, EXT2FS_KEY_DESC_PREFIX);
	strcat(key_ref_full, salt->key_ref_str);
	int ret = sys_add_key(EXT2FS_KEY_TYPE_LOGON, key_ref_full, (void *)&key, sizeof(key), keyring_id);
	if (ret < 0) {
		printk("Dongle Mount Error: failed to add second\n");
		return -1;
	}

	struct ext4_encryption_policy policy;
	policy.version = 0;
	policy.contents_encryption_mode = EXT4_ENCRYPTION_MODE_AES_256_XTS;
	policy.filenames_encryption_mode = EXT4_ENCRYPTION_MODE_AES_256_CTS;
	policy.flags = 0;
	memcpy(policy.master_key_descriptor, salt->key_desc, EXT4_KEY_DESCRIPTOR_SIZE);
	int ffd = sys_open(path, O_RDONLY, 0);
	if (ffd < 0) {
		printk("Dongle Mount Error: failed to open %s %d\n", path, ffd);
		return -1;
	}
	ret = sys_ioctl(ffd, EXT4_IOC_SET_ENCRYPTION_POLICY, (long unsigned int)&policy);
	sys_close(ffd);
	if (ret) {
		printk("Dongle Mount Error: Error setting policy\n");
		return -1;
	}

	return 0;
}

static int do_mount_dongle(int encryption) {
	int ret, ffd, dfd;
	int reset = 0;
	struct statfs buf;
	struct loop_info64 loopinfo;

#ifdef __KERNEL__
#define ROOTALL "/root-all"
#define LOWER "/lower"
#define OVERLAY "/root"
#define LOOP "/dev/loop0"
	ret = sys_mkdir(ROOTALL, 0777);
	if (ret) {
		printk("Dongle Mount Error: failed to create dir root-all %d\n", ret);
		return -1;
	}
	ret = sys_mkdir(LOWER, 0777);
	if (ret) {
		printk("Dongle Mount Error: failed to create dir lower %d\n", ret);
		return -2;
	}

	if (strstr(saved_command_line, "mmcblk0p") != NULL)
		ret = create_dev("/dev" ROOTALL, name_to_dev_t("/dev/mmcblk0p2"));
	else
		ret = create_dev("/dev" ROOTALL, name_to_dev_t("/dev/mmcblk1p2"));
	if (ret) {
		printk("Dongle Mount Error: failed to create dev root-all (SD) %d\n", ret);
		return -3;
	}
	ret = sys_mount("/dev" ROOTALL, ROOTALL, "ext4", 0, NULL);
	if (ret) {
		printk("Dongle Mount Error: couldn't mount ext4 (emmc) %d\n", ret);
		return -4;
	}

	/* Create the loop */
	ret = create_dev(LOOP, name_to_dev_t(LOOP));
	if (ret) {
		printk("Dongle Mount Error: failed to create dev loop0 %d\n", ret);
		return -5;
	}
#endif

	if (encryption)
		crypt_folder(ROOTALL "/fs/upper");

	/* Bind ROOTALL "/os.img" to the loop */
	memset(&loopinfo, 0, sizeof(loopinfo));
	loopinfo.lo_offset = 0;

	/* 0. Update squashfs */
	ret = sys_statfs(ROOTALL "/fs/os.new.img", &buf);
	if (ret == 0) {
		reset = 1;
		sys_rename(ROOTALL "/fs/os.new.img", ROOTALL "/fs/os.img");
		printk("Dongle Mount Warning: Updating squashfs os.img\n");
	}

	/* 0. Do we have reset? */
	ret = sys_statfs(ROOTALL "/fs/upper/reset", &buf);
	if (ret == 0)
		reset = 1;
	if (reset) {
		char sz[128];
		unsigned int i;
		printk("Dongle Mount Warning: Doing Reset\n");
		get_random_bytes(&i, sizeof(i));
		sprintf(sz, ROOTALL "/fs/upper.trash.%u", i);
		sys_rename(ROOTALL "/fs/upper", sz);
		sys_mkdir(ROOTALL "/fs/upper", 0755);
		get_random_bytes(&i, sizeof(i));
		sprintf(sz, ROOTALL "/fs_/work.trash.%u", i);
		sys_rename(ROOTALL "/fs_/work", sz);
		sys_mkdir(ROOTALL "/fs_/work", 0755);
	}


	/* 1. Open the squashfs */
	ffd = sys_open(ROOTALL "/fs/os.img", O_RDONLY, 0);
	if (ffd < 0) {
		printk("Dongle Mount Error: failed to open os.img %d\n", ffd);
		return -6;
	}

	/* 2. Bind the squashfs */
	dfd = sys_open(LOOP, O_RDWR, 0);
	if (dfd < 0) {
		printk("Dongle Mount Error: failed to open loop %d\n", dfd);
		return -7;
	}

	ret = sys_ioctl(dfd, LOOP_SET_FD, ffd);
	if (ret) {
		printk("Dongle Mount Error: failed ioctl1 %d\n", ret);
		return -8;
	}
	ret = sys_ioctl(dfd, LOOP_SET_STATUS64, (long unsigned int)&loopinfo);
	if (ret) {
		printk("Dongle Mount Error: failed ioctl2 %d\n", ret);
		return -9;
	}

	/* Close descriptors */
	sys_close(dfd);
	sys_close(ffd);

	/* 3. Mount the squashfs */
	ret = sys_mkdir(LOWER, 0777);
	ret = sys_mount(LOOP, LOWER, "squashfs", MS_RDONLY, NULL);
	if(ret) {
		printk("Dongle Mount Error: failed to mount squashfs %d\n", ret);
		return -10;
	}

	/* Final mount */
	ret = sys_mkdir(ROOTALL "/fs/upper", 0755);
	ret = sys_mkdir(ROOTALL "/fs_", 0755);
	ret = sys_mkdir(ROOTALL "/fs_/work", 0755);
	ret = sys_mount("none", OVERLAY, "overlay", 0, "lowerdir=" LOWER ",upperdir=" ROOTALL "/fs/upper,workdir=" ROOTALL "/fs_/work");
	if(ret) {
		printk("Dongle Mount Error: failed to mount overlayfs %d\n", ret);
		return -13;
	}

	printk("Dongle Mount: Success\n");
#ifdef __KERNEL__
	sys_chdir(OVERLAY);
#endif
	return 0;
}
