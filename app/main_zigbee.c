#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <time.h>
#include <string.h>
#include <unistd.h>
#include <getopt.h>
#include <fcntl.h>
#include <poll.h>
#include <termios.h>
#include <sys/ioctl.h>
#include "macro.h"
#include "sbl.h"
#include "sbl2.h"

//Private variables
static struct termios termioOriginal;
static struct pollfd pollfd[1];
static char szUart[256];
static char szFirmware[256];
static char szFirmware3[256];

//Functions
static int readValue(const char *path, const char *key) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	int fd = open(fullpath, O_RDONLY);
	int v = -1;
	char buf[16];
	char *p;
	if (fd >= 0) {
		int ret = read(fd, buf, 16);
		if (ret > 0) {
			buf[ret] = '\0';
			v = strtol(buf, &p, 10);
		}
		close(fd);
	}
	return v;
}

static void writeValue(const char *path, const char *v) {
	int fd = open(path, O_WRONLY | O_CREAT, 0644);
	if (fd >= 0) {
		write(fd, v, strlen(v));
		close(fd);
	}
}

static void writeValueInt(const char *path, int i) {
	char sz[8];
	sprintf(sz, "%d", i);
	writeValue(path, sz);
}

static void writeValueKeyInt(const char *path, const char *key, int i) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	writeValueInt(fullpath, i);
}

static void enterInputMode() {
	int fd = fileno(stdin);
	struct termios zap;
	tcgetattr(fd, &termioOriginal);
	zap = termioOriginal;
	zap.c_cc[VMIN] = 0;
	zap.c_cc[VTIME] = 0;
	zap.c_lflag = 0;
	tcsetattr(fd, TCSANOW, &zap);
}

static void leaveInputMode() {
	int fd = fileno(stdin);
	tcsetattr(fd, TCSANOW, &termioOriginal);
}

static void crc32(char *path) {
	FILE *fp = fopen(szFirmware, "rb");
	if (fp) {
		int isM4 = 1;
		int size = isM4 ? 1024 * 352 : 1024 * 128;
		int todo = isM4 ? 1024 * 352 : 1024 * 128;
		unsigned char *pucData = malloc(size);
		fread(pucData, size, 1, fp);
		fclose(fp);
		PRINTF("CRC 0x%x\n", calcCrcLikeChip(pucData, size));
		free(pucData);
	}
}

static int isServiceRunning(const char* serviceName) {
    char command[256];
    snprintf(command, sizeof(command), "systemctl is-active --quiet %s.service", serviceName);
    int status = system(command);
    if (WIFEXITED(status))
        if (WEXITSTATUS(status) == 0)
            return 1;
    return 0;
}

static void processInput(char c) {
	PRINTF("processInput %c\n", c);
	switch (c) {
	case 'b':
		CCuninitCommunication();
		break;
	case 'C':
		CCreset();
		break;
	case 'd':
		CCdumpMetadata();
		break;
	case 'e':
		CCeraseFlashAll();
		PRINTF("Erase done\n");
		break;
	case 'h':
		PRINTF("*******************************************************\n");
		PRINTF("Usage for keyboard input:\n");
		PRINTF("b:	Uninit Communication\n");
		PRINTF("C:	Software reset\n");
		PRINTF("d:	Dump chip info\n");
		PRINTF("e:	Erase Flash\n");
		PRINTF("h:	Print help information\n");
		PRINTF("r:	Read ccfg memory from chip\n");
		PRINTF("t:	Read ccfg memory in file %s\n", szFirmware);
		PRINTF("u:	Calculate crc32 of file %s\n", szFirmware);
		PRINTF("w:	Download firmware from file %s to chip\n", szFirmware);
		PRINTF("x:	Exit\n");
		PRINTF("*******************************************************\n");
		break;
	case 'r':
		CCreadMemory();
		break;
	case 't':
		CCreadMemoryFromFile(szFirmware);
		break;
	case 'u':
		crc32(szFirmware);
		break;
	case 'w':
		CCwriteFirmware(NULL, szFirmware, 1, NULL);
		break;
	case 'x':
		leaveInputMode();
		exit(0);
		break;
	default:
		break;
	}
}

int main(int argc, char **argv) {
	int option;
	int automatic = 0;
	int nosound = 0;
	int dotest = 0;

	if (isServiceRunning("zigbee2mqtt")) {
		PRINTF("Exiting as zigbee2mqtt is running\n");
		return 0;
	}

	strcpy(szUart, ZIGBEE_DEV);
	strcpy(szFirmware, ZIGBEE_FIRMWARE);

	while ((option = getopt(argc, argv, "aho:pst")) != -1) {
		switch (option) {
		case 'a':
			automatic = 1;
			break;
		case 'h':
			PRINTF("*******************************************************\n");
			PRINTF("Usage for zigbee [-a -h -o firmware -p -s -t]\n");
			PRINTF("a:	Automatic mode\n");
			PRINTF("h:	Print this usage and exit\n");
			PRINTF("o:	Set path of firmware\n");
			PRINTF("p:	Do on PC\n");
			PRINTF("s:	No sound\n");
			PRINTF("t:	Do test presence Zigbee\n");
			return 0;
		case 'o':
			strcpy(szFirmware, optarg);
			break;
		case 'p':
			strcpy(szUart, "/dev/ttyUSB0");
			strcpy(szFirmware, "../rootfs");
			strcat(szFirmware, ZIGBEE_FIRMWARE);
			break;
		case 's':
			nosound = 1;
			break;
		case 't':
			dotest = 1;
			break;
		default:
			break;
		}
	}

	if (dotest) {
		int fd = openUART(szUart, B115200);
		unsigned char data[128];
		data[0] = 0xfe; data[1] = 0x00; data[2] = 0x21; data[3] = 0x02; data[4] = 0x23;
		write(fd, data, 5);
		memset(data, 0, 128);
		int ret = read(fd, data, 128);
		PRINTF("Data(%d): ", ret);
		for (int i = 0; i < ret; i++)
			PRINTF_("0x%x ", data[i]);
		PRINTF_("\n");
		PRINTF("Version: maintrel:%d majorrel:%d minorrel:%d product:%d revision:%d transportrev:%d type:%d\n", data[5], data[6], data[7], data[8], (data[9] << 0) + (data[10] << 8) + (data[11] << 16) + (data[12] << 24), data[4], data[13]);
		return 0;
	}

	if (automatic) {
		if (CCFlash(szUart, NULL, szFirmware, 0) && nosound == 0)
			writeValueKeyInt(PLATFORM_PATH, "buzzer", 3);
		else
			writeValueKeyInt(PLATFORM_PATH, "buzzer", 11);
	} else {
		CCinitCommunication(szUart, 0);
		enterInputMode();
		pollfd[0].fd = fileno(stdin);
		pollfd[0].events = POLLIN;
		while (1) {
			poll(pollfd, 1, -1);

			if (pollfd[0].revents & POLLIN) {
				char c[2];
				read(pollfd[0].fd, c, 1);
				c[1] = '\0';
				processInput(c[0]);
			}
		}
	}
}
