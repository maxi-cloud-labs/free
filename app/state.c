#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <time.h>
#include "macro.h"
#include "cJSON.h"
#include "state.h"
#ifndef WEB
#include "json.h"
#endif

//Global variables
stateS state;
cJSON *stateCloud;

//Functions
void stateDefault() {
	state.otp = 0;
	state.current = 0;
	state.previous = 0;
	state.homePos = 0;
	state.tipsPos = 0;
	state.messageNb = 0;
	state.messageOK = 0;
	state.setupPercentage = 0;
#if !defined(DESKTOP) && !defined(WEB)
	state.rotation = 3;
#else
	state.rotation = 0;
#endif
	state.sleepKeepLed = 0;
	state.noBuzzer = 0;
	state.setupDone = 0;
	state.language = 0;
}

void stateDump() {
	PRINTF("state otp: %d\n", state.otp);
	PRINTF("state current: %d\n", state.current);
	PRINTF("state previous: %d\n", state.previous);
	PRINTF("state homePos: %d\n", state.homePos);
	PRINTF("state tipsPos: %d\n", state.tipsPos);
	PRINTF("state messageNb: %d\n", state.messageNb);
	PRINTF("state messageOK: %d\n", state.messageOK);
	PRINTF("state setupPercentage: %d\n", state.setupPercentage);
	PRINTF("state rotation: %d\n", state.rotation);
	PRINTF("state sleepKeepLed: %d\n", state.sleepKeepLed);
	PRINTF("state noBuzzer: %d\n", state.noBuzzer);
	PRINTF("state setupDone: %d\n", state.setupDone);
	PRINTF("state language: %d\n", state.language);
}

void stateLoad_(char *sz) {
	if (sz)
		stateCloud = cJSON_Parse(sz);
#ifndef WEB 
	else
		stateCloud = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
#endif
	if (stateCloud == NULL)
		stateCloud = cJSON_CreateObject();
	if (cJSON_HasObjectItem(stateCloud, "hardware") && cJSON_HasObjectItem(cJSON_GetObjectItem(stateCloud, "hardware"), "dongle")) {
		state.noBuzzer = 0;
		//state.rotation = 0;
		state.sleepKeepLed = 0;
	}
	if (cJSON_HasObjectItem(stateCloud, "info") && cJSON_HasObjectItem(cJSON_GetObjectItem(stateCloud, "info"), "setup")) {
		char *s = cJSON_GetStringValue3(stateCloud, "info", "setup");
		state.setupDone = strcmp(s, "done2")  == 0 ? 4 : strcmp(s, "progress2")  == 0 ? 3 : strcmp(s, "done1")  == 0 ? 2 : strcmp(s, "progress1")  == 0 ? 1 : 0;
	}
	if (cJSON_HasObjectItem(stateCloud, "info") && cJSON_HasObjectItem(cJSON_GetObjectItem(stateCloud, "info"), "language")) {
		char *s = cJSON_GetStringValue3(stateCloud, "info", "language");
		state.language = strcmp(s, "fr")  == 0 ? 1 : 0;
	}
}

void stateLoad() {
	stateLoad_(NULL);
}

void updateStateStats() {
#ifndef WEB
	state.storageUsed = 0;
	state.storageTotal = 0;
	state.temperature = 0;
	state.cpuUsed = 0;
	state.memUsed = 0;
#endif
}
