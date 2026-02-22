#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <sys/stat.h>
#include <pthread.h>
//_Thread_local
#include "lvgl.h"
#include "macro.h"
#include "common.h"
#include "logic.h"
#include "backend.h"
#include "ui.h"
#include "settings.h"
#include "cJSON.h"
#include "communication.h"
#ifndef WEB
#include "password.h"
#endif

//Public variables
logics lmdc;
int slaveMode = 0;

//Private variables
_Thread_local static int mainUIThread = 0;

//Functions
void logicUIThread() {
	mainUIThread = 1;
}

void logicKey(int key, int longPress) {
	if (slaveMode) {
		cJSON *el = cJSON_CreateObject();
		cJSON_AddStringToObject(el, "a", "key");
		cJSON_AddNumberToObject(el, "k", key);
		cJSON_AddNumberToObject(el, "l", longPress);
		communicationJSON(el);
		cJSON_Delete(el);
		return;
	}

	if (lmdc.current == LOGIC_WELCOME) {//Rotations, OK
		if (longPress && key == LV_KEY_UP)
			logicSleep(0);
		else if (longPress && key == LV_KEY_DOWN)
			logicShutdown();
		else if (key == LV_KEY_UP) {
			if (backendRotate(1) == 0)
				logicWelcome();
		} else if (key == LV_KEY_DOWN) {
			if (backendRotate(-1) == 0)
				logicWelcome();
		} else if (key == LV_KEY_LEFT) {
			if (backendRotate(-1) == 0)
				logicWelcome();
		} else if (key == LV_KEY_RIGHT) {
			if (smdc.setupDone)
				logicHome(-1, 0);
			else
				logicQrSetup();
		}
	} else if (lmdc.current == LOGIC_SLEEP) {
#ifndef DESKTOP
		system("/usr/local/modules/_core_/leds.sh -b 1 -l normal");
#endif
		logicHome(-1, 0);
	} else if (lmdc.current == LOGIC_HOME) {//Rotations, Tips, Next
		if (longPress && key == LV_KEY_UP)
			logicSleep(0);
		else if (longPress && key == LV_KEY_DOWN)
			logicShutdown();
		else if (key == LV_KEY_UP) {
			if (backendRotate(1) == 0)
				logicHome(-1, 0);
		} else if (key == LV_KEY_DOWN) {
			if (backendRotate(-1) == 0)
				logicHome(-1, 0);
		} else if (key == LV_KEY_LEFT)
			logicTips(0, 0);
		else if (key == LV_KEY_RIGHT)
			logicHome(-1, 1);
	} else if (lmdc.current == LOGIC_SETUP) {
	} else if (lmdc.current == LOGIC_QR_SETUP) {//Done
		if (key == LV_KEY_RIGHT)
			logicWelcome();
	} else if (lmdc.current == LOGIC_QR_LOGIN) {//Done
		if (key == LV_KEY_RIGHT)
			logicHome(0, 0);
	} else if (lmdc.current == LOGIC_TIPS) {//Back, Setup, Previous, Next
		if (key == LV_KEY_UP)
			logicHome(-1, 0);
		else if (key == LV_KEY_DOWN)
			logicQrLogin();
		else if (key == LV_KEY_LEFT)
			logicTips(-1, -1);
		else if (key == LV_KEY_RIGHT)
			logicTips(-1, 1);
	} else if (lmdc.current == LOGIC_OTP) {//Cancel
		if (key == LV_KEY_LEFT)
			logicOtpFinished();
	} else if (lmdc.current == LOGIC_SHUTDOWN) {//Yes, No
		if (key == LV_KEY_LEFT)
			logicHome(0, 0);
		else if (key == LV_KEY_RIGHT)
			logicBye();
	} else if (lmdc.current == LOGIC_BYE) {
	} else if (lmdc.current == LOGIC_SLAVENOTCONNECTED) {
	} else if (lmdc.current == LOGIC_MESSAGE)
		logicHome(0, 0);
}

void logicUpdate() {
#ifndef WEB
	if (!mainUIThread) {
		unsigned long value = 1;
		int ret = write(eventFdUI, &value, sizeof(value));
		return;
	}
#endif
	static int first = 1;
	if (first) {
		uiScreenInit();
		first = 0;
	}
	if (lmdc.current == LOGIC_WELCOME)
		uiScreenWelcome();
	else if (lmdc.current == LOGIC_SLEEP)
		uiScreenSleep();
	else if (lmdc.current == LOGIC_HOME)
		uiScreenHome();
	else if (lmdc.current == LOGIC_SETUP)
		uiScreenSetup();
	else if (lmdc.current == LOGIC_QR_SETUP)
		uiScreenQrSetup();
	else if (lmdc.current == LOGIC_QR_LOGIN)
		uiScreenQrLogin();
	else if (lmdc.current == LOGIC_TIPS)
		uiScreenTips();
	else if (lmdc.current == LOGIC_SHUTDOWN)
		uiScreenShutdown();
	else if (lmdc.current == LOGIC_BYE)
		uiScreenBye();
	else if (lmdc.current == LOGIC_MESSAGE)
		uiScreenMessage();
	else if (lmdc.current == LOGIC_OTP)
		uiScreenOtp(59);
	else if (lmdc.current == LOGIC_SLAVENOTCONNECTED)
		uiScreenSlaveNotConnected();

	if (!slaveMode && communicationConnected)
		communicationState();
}

void logicWelcome() {
	PRINTF("Logic: Welcome rot:%d\n", smdc.rotation);
	lmdc.current = LOGIC_WELCOME;
	logicUpdate();
}

void logicSleep(int autoSleep) {
	PRINTF("Logic: Sleep from %s\n", autoSleep ? "auto" : "user");
#ifndef DESKTOP
	if (smdc.sleepKeepLed)
		system("/usr/local/modules/_core_/leds.sh -b 0 -l normal");
	else
		system("/usr/local/modules/_core_/leds.sh -b 0 -l off");
#endif
	lmdc.current = LOGIC_SLEEP;
	logicUpdate();
}

void logicHome(int force, int incr) {
	if (force != -1)
		lmdc.homePos = force;
	else
		lmdc.homePos = (lmdc.homePos + 4 + incr) % 4;
	PRINTF("Logic: Home #%d rot:%d\n", lmdc.homePos, smdc.rotation);
	lmdc.current = LOGIC_HOME;
	logicUpdate();
}

void logicSetup(char *string, int percentage) {
	lmdc.setupPercentage = percentage;
	lmdc.string = string;
	PRINTF("Logic: Setup\n");
	lmdc.current = LOGIC_SETUP;
	logicUpdate();
}

void logicQrSetup() {
	PRINTF("Logic: QR Setup\n");
	lmdc.current = LOGIC_QR_SETUP;
	logicUpdate();
}

void logicQrLogin() {
	PRINTF("Logic: QR Login\n");
	lmdc.current = LOGIC_QR_LOGIN;
	logicUpdate();
}

void logicTips(int force, int incr) {
	int size = 6;//FIXME coming from sizeof(szTips)/sizeof(szTips[0])
	if (force != -1)
		lmdc.tipsPos = force;
	else
		lmdc.tipsPos = (lmdc.tipsPos + size + incr) % size;
	PRINTF("Logic: Tips #%d\n", lmdc.tipsPos + 1);
	lmdc.current = LOGIC_TIPS;
	logicUpdate();
}

void logicShutdown() {
	PRINTF("Logic: Shutdown\n");
	lmdc.current = LOGIC_SHUTDOWN;
	logicUpdate();
}

static void *bye_t(void *arg) {
	usleep(1000 * 1000);
#ifdef DESKTOP
	cleanExit(0);
#else
	cleanExit(1);
#endif
	return 0;
}

void logicBye() {
	PRINTF("Logic: Bye\n");
#if !defined(DESKTOP) && !defined(WEB)
	pthread_t pth;
	pthread_create(&pth, NULL, bye_t, NULL);
#endif
	lmdc.current = LOGIC_BYE;
	logicUpdate();
}

void logicMessage(int message, int ok) {
	lmdc.messageNb = message;
	lmdc.messageOK = ok;
	PRINTF("Logic: Message\n");
	lmdc.current = LOGIC_MESSAGE;
	logicUpdate();
}

void logicOtp(int v, char *email) {
#ifndef WEB
	PRINTF("Logic: OTP%s %s\n", v != -1 ? " (forced)" : "(random)", email);
	if (v != -1)
		lmdc.otp = v;
	else
		lmdc.otp = oathCreate();
	buzzer(1);
	lmdc.current = LOGIC_OTP;
	logicUpdate();
#endif
}

void logicOtpFinished() {
#ifndef WEB
	PRINTF("Logic: OTP finished\n");
	lmdc.otp = 0;
	oathDelete();
	logicHome(0, 0);
#endif
}


void logicSlaveNotConnected() {
	PRINTF("Logic: Slave not connected\n");
	lmdc.current = LOGIC_SLAVENOTCONNECTED;
	logicUpdate();
}
