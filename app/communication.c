//Browser
//dongle.page.ts	appButton
//appWrapper.js		Module._button
//backend-web.c		button
//backend.c			processButton
//logic.c			logicKey
//communication.c	communicationJSON
//comHtml.c			serverWriteDataHtml
//appWrapper.js		appServerWriteDataHtml
//ble.ts			writeData, BleClient.write (potentially split in chunks)
//OVER-THE-AIR browser->dongle
//comBle.c			le_callback
//communication.c	communicationReceive, logicKey
//backend.c			logicKey
//logic.c			logicUpdate
//communication.c	communicationState, communicationJSON
//comBle.c			serverWriteDataBle, write_ctic
//OVER-THE-AIR dongle->browser
//ble.ts			bleNotifyDataCb, appServerReceive(b64=0)
//appWrapper.js		Module._serverReceiveHtml
//comHtml.c			serverReceiveHtml
//communication.c	communicationReceive
//logic.c			logicUpdate
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <unistd.h>
#include <time.h>
#include <pthread.h>
#include "macro.h"
#include "cJSON.h"
#ifdef WEB
#include "comHtml.h"
#else
#include "comBle.h"
#include "comWebSocket.h"
#include "json.h"
#include "wifi.h"
#include "common.h"
#include "cloud.h"
#include "modules.h"
#endif
#include "base64.h"
#include "logic.h"
#include "backend.h"
#include "settings.h"
#include "password.h"

//Public variable
int communicationConnected = 0;

//Functions
void communicationConnection(int typ, int val) {
	//type is 0:Websocket, 1:BLE, 2:HTML
	if (val)
		communicationConnected |= 1 << typ;
	else
		communicationConnected &= 7 & ~(1 << typ);
	if (slaveMode && val == 0)
		logicSlaveNotConnected();
}

int communicationString(char *sz) {
#ifdef WEB
	return serverWriteDataHtml(sz, strlen(sz));
#else
	int retB = 0, retWS = 0;
	if (communicationConnected & 1)
		retWS = serverWriteDataWebSocket(sz, strlen(sz));
	if (communicationConnected & 2)
		retB = serverWriteDataBle(sz, strlen(sz));
	return retB != 0 ? retB : retWS;
#endif
}

int communicationJSON(void *el) {
	char *sz = cJSON_Print((cJSON *)el);
	int ret = communicationString(sz);
	free(sz);
	return ret;
}

int communicationState() {
	if (!communicationConnected)
		return 0;
	cJSON *el = cJSON_CreateObject();
	cJSON_AddStringToObject(el, "a", "state");
	unsigned char *data_ = malloc(sizeof(smdc) + sizeof(lmdc));
	memcpy(data_, &smdc, sizeof(smdc));
	memcpy(data_ + sizeof(smdc), &lmdc, sizeof(lmdc));
	char *sz = b64_encode(data_, sizeof(smdc) + sizeof(lmdc));
	free(data_);
	cJSON_AddStringToObject(el, "p", sz);
	free(sz);
	int ret = communicationJSON(el);
	cJSON_Delete(el);
	return ret;
}

static void *communicationState_t(void *arg) {
	usleep(250 * 1000);
	communicationState();
	return 0;
}

static void communicationStateDelayed() {
	pthread_t pth;
	pthread_create(&pth, NULL, communicationState_t, NULL);
}

#ifndef WEB
static void *cloudSetup1_t(void *arg) {
	cJSON *el = (cJSON *)arg;
	cloudSetup1(el, 0);
	cJSON_Delete(el);
}

static void *cloudSetup2_t(void *arg) {
	cloudSetup2();
}
#endif

void communicationReceive(unsigned char *data, int size, char *orig) {
//	PRINTF("communicationReceive: (%d)#%s# via %s\n", size, data, orig);
	cJSON *el = cJSON_Parse(data);
	char *action = NULL;
	if (el)
		action = cJSON_GetStringValue2(el, "a");
	if (action) {
		if (strcmp(action, "otp") == 0) {
			char *email = cJSON_GetStringValue2(el, "e");
			PRINTF("communicationReceive: OTP by %s\n", email);
			int v = -1;
			if (cJSON_HasObjectItem(el, "v"))
				v = (int)cJSON_GetNumberValue2(el, "v");
			if (v == 0)
				logicOtpFinished();
			else
				logicOtp(v, email);
		} else if (strcmp(action, "shutdown") == 0) {
			PRINTF("communicationReceive: Shutdown\n");
			logicShutdown();
		} else if (strcmp(action, "key") == 0) {
			int k = (int)cJSON_GetNumberValue2(el, "k");
			int l = (int)cJSON_GetNumberValue2(el, "l");
#ifndef WEB
			touchClick();
#endif
			logicKey(k, l);
		} else if (strcmp(action, "language") == 0) {
			char *l = cJSON_GetStringValue2(el, "l");
			settingsLanguage(strcmp(l, "fr") == 0);
			logicUpdate();
		} else if (strcmp(action, "state") == 0) {
			unsigned long decsize;
			unsigned char *payload = b64_decode_ex(cJSON_GetStringValue2(el, "p"), &decsize);
			memcpy(&smdc, payload, sizeof(smdc));
			memcpy(&lmdc, payload + sizeof(smdc), sizeof(lmdc));
			free(payload);
			logicUpdate();
#ifndef WEB
		} else if (strcmp(action, "pam") == 0) {
			char *user = cJSON_GetStringValue2(el, "u");
			char *service = cJSON_GetStringValue2(el, "s");
			char *type = cJSON_GetStringValue2(el, "t");
			char *arg1 = cJSON_GetStringValue2(el, "o");
			//PRINTF("PAM: user:%s service:%s type:%s arg1:%s\n", user, service, type, arg1);
			if (arg1 && strcmp(arg1, "oath_success") == 0)
				logicOtpFinished();
		} else if (strcmp(action, "setup1") == 0) {
#ifdef DESKTOP
			PRINTF("communicationReceive: Setup1\n%s\n", data);
#else
			//PRINTF("communicationReceive: Setup1\n");
			touchClick();
			pthread_t pth;
			pthread_create(&pth, NULL, cloudSetup1_t, (void *)el);
#endif
			return;
		} else if (strcmp(action, "setup2") == 0) {
#ifdef DESKTOP
			PRINTF("communicationReceive: Setup2\n%s\n", data);
#else
			//PRINTF("communicationReceive: Setup2\n");
			touchClick();
			pthread_t pth;
			pthread_create(&pth, NULL, cloudSetup2_t, NULL);
#endif
			return;
		} else if (strcmp(action, "status") == 0) {
			//PRINTF("communicationReceive: status #%s#\n", data);
			moduleSetupDone(cJSON_GetStringValue2(el, "module"));
			communicationString(data);
		} else if (strcmp(action, "cloud") == 0) {
			cJSON *cloud = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
			cJSON_AddStringToObject(cloud, "a", "cloud");
			communicationJSON(cloud);
			cJSON_Delete(cloud);
		} else if (strcmp(action, "wifi-scan") == 0) {
			cJSON *ssids = wiFiScan();
			communicationJSON(ssids);
			cJSON_Delete(ssids);
		} else if (strcmp(action, "alert") == 0) {
			PRINTF("communicationReceive: alert type:%s name:%s\n", cJSON_GetStringValue2(el, "type"), cJSON_GetStringValue2(el, "name"));
		} else if (strcmp(action, "refresh-webserver") == 0) {
			//PRINTF("communicationReceive: refresh-webserver\n");
			touchClick();
			cloudInit();
		} else if (strcmp(action, "refresh-screen") == 0) {
			//PRINTF("communicationReceive: refresh-screen\n");
			communicationStateDelayed();
#endif
		} else if (strcmp(action, "date") == 0) {
			;
		} else {
			PRINTF("communicationReceive: action:%s via %s\n", action, orig);
#ifndef WEB
			jsonDump(el);
#endif
		}
	}
	cJSON_Delete(el);
}
