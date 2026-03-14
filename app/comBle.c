#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/stat.h>
#include <bluetooth/bluetooth.h>
#include "btlib.h"
#include "bluetoothAddr.h"
#include "macro.h"
#include "communication.h"
#include "common.h"
#include "cJSON.h"
#include "json.h"

//Global variable
char bluetoothClassicAddr[18] = { 0 };

//Private variable
static pthread_mutex_t bleMutex = PTHREAD_MUTEX_INITIALIZER;

//Functions
int serverWriteDataBle(unsigned char *data, int size) {
	pthread_mutex_lock(&bleMutex);
	if (size <= BLE_CHUNK)
		write_ctic(localnode(), UUID_DATA - 0xfff1, data, size);
	else if (size <= 256 * (BLE_CHUNK - 2)) {
		char data_[256];
		int remain = size;
		int count = 0;
		while (remain > 0) {
			if (count == 0) {
				data_[0] = 1;
				data_[1] = (int)(size / (BLE_CHUNK - 2));
				if (size > data_[1] * (BLE_CHUNK - 2))
					data_[1]++;
			} else {
				data_[0] = 2;
				data_[1] = count;
			}
			int chunkSize = MIN2(remain, BLE_CHUNK - 2);
			memcpy(data_ + 2, data + count * (BLE_CHUNK - 2), chunkSize);
			write_ctic(localnode(), UUID_DATA - 0xfff1, data_, chunkSize + 2);
			usleep(50 * 1000);
			remain -= chunkSize;
			count++;
		}
	}
	pthread_mutex_unlock(&bleMutex);
	return size;
}

static int serverReadDataBle(unsigned char *data_, int size) {
	static unsigned char *data = NULL;
	static int pos = 0;
	static int chunks = 0;
	if (data_[0] == 1) {
		data = malloc(data_[1] * (BLE_CHUNK - 2));
		memset(data, 0, data_[1] * (BLE_CHUNK - 2));
		pos = 0;
		chunks = data_[1];
		memcpy(data + pos, data_ + 2, BLE_CHUNK - 2);
		pos += BLE_CHUNK - 2;
		chunks--;
	} else if (data != NULL && data_[0] == 2) {
		memcpy(data + data_[1] * (BLE_CHUNK - 2), data_ + 2, size - 2);
		pos += size - 2;
		chunks--;
		if (chunks == 0) {
			communicationReceive(data, pos, "ble");
			free(data);
			data = NULL;
		}
	} else if (data_[0] == '{')
		communicationReceive(data_, size, "ble");
	else {
		PRINTF("serverReadData: ERROR\n");
	}
}

static int le_callback(int clientnode, int operation, int cticn) {
	if(operation == LE_CONNECT) {
		communicationConnection(1, 1);
		PRINTF("le_callback connect from %s(%d)\n", device_name(clientnode), clientnode);
		buzzer(1);
	} else if(operation == LE_READ) {
		//PRINTF("le_callback: %s read by %s\n", ctic_name(localnode(), cticn), device_name(clientnode));
	} else if(operation == LE_WRITE) {
		//PRINTF("le_callback: %s written by %s\n",ctic_name(localnode(), cticn), device_name(clientnode));
		char buf[256];
		memset(buf, 0, 256);
		int nread = read_ctic(localnode(), cticn, buf, sizeof(buf));
		//PRINTF("le_callback: len=%d 0x%x=%d\n", nread, buf[0], buf[0]);
		serverReadDataBle(buf, nread);
	} else if(operation == LE_DISCONNECT) {
		communicationConnection(1, 0);
		PRINTF("le_callback: disconnect from %s\n", device_name(clientnode));
		buzzer(3);
	} else if(operation == LE_TIMER) {
		PRINTF("le_callback: timer\n");
	}
	return SERVER_CONTINUE;
}

static void *bleStart_t(void *arg) {
#ifndef DESKTOP
	bluetoothAddr(bluetoothClassicAddr, 0);
	FILE *pf = fopen("/tmp/blecfg.txt", "w");
	if (pf) {
		char sz[1024];
		char nn[128];
		snprintf(nn, sizeof(nn), "mAxI-%s", "1234567890");
		cJSON *cloud = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
		if (cloud && cJSON_HasObjectItem(cloud, "info") && cJSON_HasObjectItem(cJSON_GetObjectItem(cloud, "info"), "name"))
			snprintf(nn, 27, "mAxI-%s", cJSON_GetStringValue2(cJSON_GetObjectItem(cloud, "info"), "name"));
		else
			snprintf(nn, 27, "mAxI-%s", szSerial);
		cJSON_Delete(cloud);
		snprintf(sz, sizeof(sz), "DEVICE=%s type=mesh node=2 address=%s\n", nn, bluetoothClassicAddr);
		fwrite(sz, strlen(sz), 1, pf);
		char szTplt[] = "\
 PRIMARY_SERVICE=0000fff0-a82e-1000-8000-00805f9b34fb\n\
 lechar=Version permit=2 size=10 uuid=0000fff1-a82e-1000-8000-00805f9b34fb\n\
 lechar=Data permit=1a size=182 uuid=0000fff2-a82e-1000-8000-00805f9b34fb\n";//BLE_CHUNK
		fwrite(szTplt, strlen(szTplt), 1, pf);
		fclose(pf);
	}
	int ret = init_blue("/tmp/blecfg.txt");
	if (ret != 1) {
		PRINTF("ERROR: 2. No btferret started\n");
		return 0;
	}
	write_ctic(localnode(), UUID_VERSION - 0xfff1, APP_VERSION, 0);
	usleep(1000 * 1000);
	le_server(le_callback, 0);
	close_all();
#endif
}

void bleStart() {
	pthread_t pth;
	pthread_create(&pth, NULL, bleStart_t, NULL);
}
