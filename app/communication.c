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
#include "comAuth.h"
#include "json.h"
#include "common.h"
#include "language.h"
#endif
#include "base64.h"
#include "logic.h"
#include "backend.h"
#include "state.h"
#include "password.h"

//Public variable
int communicationConnected = 0;

//Private variable
#ifndef WEB
static char setupString[128];
#endif

//Functions
void communicationConnection(int typ, int val) {
	//type is 0:Browsers via better-auth, 1:BLE, 2:HTML
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
	int retB = 0, retA = 0;
	if (communicationConnected & 1)
		retA = serverForwardDataAuth(sz);
	if (communicationConnected & 2)
		retB = serverWriteDataBle(sz, strlen(sz));
	return retB != 0 ? retB : retA;
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
	unsigned char *data_ = malloc(sizeof(stateS));
	memcpy(data_, &state, sizeof(stateS));
	char *sz = b64_encode(data_, sizeof(stateS));
	free(data_);
	cJSON_AddStringToObject(el, "p", sz);
	free(sz);
	int ret = communicationJSON(el);
	cJSON_Delete(el);
	return ret;
}

#ifndef WEB
//Messages only accepted from better-auth, neither handled nor forwarded when coming from BLE
static int internalAction(char *action) {
	const char *internal[] = { "connection", "forward", "setup-progress", "message", "buzzer", "jingle", "touch" };
	for (int i = 0; i < sizeof(internal) / sizeof(internal[0]); i++)
		if (strcmp(action, internal[i]) == 0)
			return 1;
	return 0;
}
#endif

//Setup, modules, Wi-Fi, cloud... are handled by better-auth (auth/src/communication.ts)
void communicationReceive(unsigned char *data, int size, char *orig) {
//	PRINTF("communicationReceive: (%d)#%s# via %s\n", size, data, orig);
	cJSON *el = cJSON_Parse(data);
	char *action = NULL;
	if (el)
		action = cJSON_GetStringValue_(el, "a");
#ifndef WEB
	if (action && strcmp(orig, "auth") != 0 && internalAction(action)) {
		PRINTF("communicationReceive: action:%s via %s refused\n", action, orig);
		action = NULL;
	}
#endif
	if (action) {
		if (strcmp(action, "otp") == 0) {
			char *email = cJSON_GetStringValue_(el, "e");
			PRINTF("communicationReceive: OTP by %s\n", email);
			int v = -1;
			if (cJSON_HasObjectItem(el, "v"))
				v = (int)cJSON_GetNumberValue_(el, "v");
			if (v == 0)
				logicOtpFinished();
			else
				logicOtp(v, email);
		} else if (strcmp(action, "passcode") == 0) {
			int v = (int)cJSON_GetNumberValue_(el, "v");
			PRINTF("communicationReceive: Passcode\n");
			if (v > 0)
				logicOtp(v, "");
		} else if (strcmp(action, "shutdown") == 0) {
			PRINTF("communicationReceive: Shutdown\n");
			logicShutdown();
		} else if (strcmp(action, "key") == 0) {
			int k = (int)cJSON_GetNumberValue_(el, "k");
			int l = (int)cJSON_GetNumberValue_(el, "l");
#ifndef WEB
			touchClick();
#endif
			logicKey(k, l);
		} else if (strcmp(action, "language") == 0) {
			char *l = cJSON_GetStringValue_(el, "l");
			//settingsLanguage(strcmp(l, "fr") == 0);
			logicUpdate();
		} else if (strcmp(action, "state") == 0) {
			unsigned long decsize;
			unsigned char *payload = b64_decode_ex(cJSON_GetStringValue_(el, "p"), &decsize);
			if (payload && decsize >= sizeof(stateS))
				memcpy(&state, payload, sizeof(stateS));
			free(payload);
			logicUpdate();
#ifndef WEB
		} else if (strcmp(action, "refresh-screen") == 0) {
			//PRINTF("communicationReceive: refresh-screen\n");
			communicationState();
		} else if (strcmp(action, "connection") == 0) {
			communicationConnection(0, (int)cJSON_GetNumberValue_(el, "v"));
		} else if (strcmp(action, "forward") == 0) {
			//From better-auth to the BLE client
			if (communicationConnected & 2) {
				char *sz = cJSON_PrintUnformatted(cJSON_GetObjectItem(el, "p"));
				if (sz) {
					serverWriteDataBle(sz, strlen(sz));
					free(sz);
				}
			}
		} else if (strcmp(action, "setup-progress") == 0) {
			char *n = cJSON_GetStringValue_(el, "n");
			snprintf(setupString, sizeof(setupString), "%s", n ? n : "");
			logicSetup(cJSON_GetNumberValue_(el, "t") == 1 ? (char *)L((unsigned char *)setupString) : setupString, (int)cJSON_GetNumberValue_(el, "p"));
		} else if (strcmp(action, "message") == 0) {
			logicMessage((int)cJSON_GetNumberValue_(el, "m"), (int)cJSON_GetNumberValue_(el, "o"));
		} else if (strcmp(action, "buzzer") == 0) {
			buzzer((int)cJSON_GetNumberValue_(el, "n"));
		} else if (strcmp(action, "jingle") == 0) {
			jingle();
		} else if (strcmp(action, "touch") == 0) {
			touchClick();
#endif
		} else if (strcmp(action, "date") == 0) {
			;
#ifndef WEB
		} else if (strcmp(orig, "ble") == 0) {
			//setup1, cloud, wifi-scan... from BLE are handled by better-auth
			if (serverWriteDataAuth(data, size) == 0)
				PRINTF("communicationReceive: action:%s via ble not forwarded\n", action);
#endif
		} else {
			PRINTF("communicationReceive: action:%s via %s\n", action, orig);
#ifndef WEB
			jsonDump(el);
#endif
		}
	}
	cJSON_Delete(el);
}
