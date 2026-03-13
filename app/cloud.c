#include <stdlib.h>
#include <stdio.h>
#include <pthread.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include "macro.h"
#include "cJSON.h"
#include "json.h"
#include "modules.h"
#include "logic.h"
#include "wifi.h"
#include "common.h"
#include "communication.h"
#include "language.h"
#include "apache2.h"
#include "cloud.h"

//Define
#define PERFORMANCE

//Private variables
static pthread_mutex_t cloudMutex = PTHREAD_MUTEX_INITIALIZER;
static int inSetup = 0;
char ipExternal[48] = "";

//Functions
static void cloudInit_() {
	if (strlen(ipExternal) == 0) {
		getExternalIP(ipExternal);
		PRINTF("IPExternal: %s\n", ipExternal);
	}
	pthread_mutex_lock(&cloudMutex);
	PRINTF("CloudInit_\n");
	cJSON *cloud = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
	if (cloud == NULL)
		cloud = cJSON_CreateObject();
	cJSON *modulesDefault = jsonRead(WEB_PATH "assets/modulesdefault.json");
	cJSON *modules = jsonRead(ADMIN_PATH "_config_/_modules_.json");
	if (modules == NULL)
		modules = cJSON_CreateObject();
	modulesInit(cloud, modulesDefault, modules, ipExternal);
	cJSON_Delete(cloud);
	cJSON_Delete(modules);
	cJSON_Delete(modulesDefault);
	pthread_mutex_unlock(&cloudMutex);
}

void cloudInit() {
	if (inSetup)
		return;
	cloudInit_();
}

static void setup(int i, int total, char *name, int root, cJSON *modules) {
#ifdef PERFORMANCE
	struct timespec ts_proc1;
	clock_gettime(CLOCK_REALTIME, &ts_proc1);
#endif
	int p = RANGE(1, 99, i * 100 / total);
	logicSetup(name, p);
	char sz[256];
	snprintf(sz, sizeof(sz), "{ \"a\":\"status\", \"progress\":%d, \"module\":\"%s\", \"state\":\"start\" }", p, name);
	communicationString(sz);
	snprintf(sz, sizeof(sz), "sudo /usr/local/modules/_core_/reset.sh -u %d %s", root, name);
	system(sz);
	cJSON *el = cJSON_CreateObject();
	cJSON_AddBoolToObject(el, "setupDone", 1);
	cJSON_AddItemToObject(modules, name, el);
	jsonWrite(modules, ADMIN_PATH "_config_/_modules_.json");
#ifdef PERFORMANCE
	struct timespec ts_proc2;
	clock_gettime(CLOCK_REALTIME, &ts_proc2);
	PRINTF("Setup %s: %.1fs\n", name, (float)deltaTime(ts_proc2, ts_proc1) / 1000.0f);
#endif
}

void setupLoop(int *i, int total, cJSON *cloud, cJSON *modulesDefault, cJSON *modules, cJSON *fqdn, int priority) {
	cJSON *elModule;
	cJSON_ArrayForEach(elModule, modulesDefault)
		if (cJSON_HasObjectItem(elModule, "setup") && cJSON_HasObjectItem(elModule, "setupPriority") == priority) {
			cJSON *elModuleDepString;
			cJSON_ArrayForEach(elModuleDepString, cJSON_GetObjectItem(elModule, "setupDependencies")) {
				cJSON *elModuleDep = cJSON_GetObjectItem(modulesDefault, cJSON_GetStringValue(elModuleDepString));
				if (cJSON_HasObjectItem(elModuleDep, "setup")) {
					int setupAlreadyDone = cJSON_HasObjectItem(modules, elModuleDep->string) && cJSON_IsTrue(cJSON_GetObjectItem(cJSON_GetObjectItem(modules, elModuleDep->string), "setupDone"));
					if (setupAlreadyDone == 0) {
						setup((*i)++, total, elModuleDep->string, cJSON_HasObjectItem(elModuleDep, "setupRoot"), modules);
						buildApache2Conf(cloud, modulesDefault, modules, fqdn, ipExternal);
#ifndef DESKTOP
						serviceAction("apache2.service", "ReloadOrRestartUnit");
#endif
					}
				}
			}
			int setupAlreadyDone = cJSON_HasObjectItem(modules, elModule->string) && cJSON_IsTrue(cJSON_GetObjectItem(cJSON_GetObjectItem(modules, elModule->string), "setupDone"));
			if (setupAlreadyDone == 0) {
				setup((*i)++, total, elModule->string, cJSON_HasObjectItem(elModule, "setupRoot"), modules);
				buildApache2Conf(cloud, modulesDefault, modules, fqdn, ipExternal);
#ifndef DESKTOP
				serviceAction("apache2.service", "ReloadOrRestartUnit");
#endif
			}
		}
}

static void wifiCallback() {
	PRINTF("WifiCallback\n");
	if (!inSetup) {
		PRINTF("Reinit Better Auth\n");
		char buf[1024];
		downloadURLBuffer("http://localhost:8091/auth/reinit", buf, "Content-Type: application/json", NULL, NULL, NULL);
	}
}

void cloudSetup1(cJSON *elSetup1, int doSetup2) {
	if (inSetup) {
		PRINTF("cloudSetup1 not run because inSetup\n");
		return;
	}
	cJSON *elCheck = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
	if (cJSON_GetArraySize(elCheck) > 0) {
		PRINTF("cloudSetup not run because already setup\n");
		cJSON_Delete(elCheck);
		return;
	}
	cJSON_Delete(elCheck);
	inSetup = 1;
	logicSetup(L("Initialization"), 0);
	cJSON *elCloud = cJSON_GetObjectItem(elSetup1, "cloud");
	char *timezone = cJSON_GetStringValue3(elCloud, "hardware", "timezone");
	if (strchr(timezone, '"') == NULL) {
		char sz[256];
		snprintf(sz, sizeof(sz), "sudo /usr/local/modules/_core_/reset.sh -t \"%s\"", timezone);
		system(sz);
	}
	cJSON *elConnectivity = cJSON_GetObjectItem(elSetup1, "connectivity");
	char *ssid = cJSON_GetStringValue3(elConnectivity, "wifi", "ssid");
	char *password = cJSON_GetStringValue3(elConnectivity, "wifi", "password");
	if (ssid && password)
		wiFiAddActivate(ssid, password, &wifiCallback);
	cJSON_SetStringValue3(elCloud, "info", "setup", "progress1");
	jsonWrite(elCloud, ADMIN_PATH "_config_/_cloud_.json");
	mkdir(ADMIN_PATH "letsencrypt", 0775);
	cJSON *elLetsencrypt = cJSON_GetObjectItem(elSetup1, "letsencrypt");
	char *fullchain, *privkey;
	int fullchainL = 0, privkeyL = 0;
	if (elLetsencrypt) {
		fullchain = cJSON_GetStringValue2(elLetsencrypt, "fullchain");
		if (fullchain)
			fullchainL = strlen(fullchain);
		privkey = cJSON_GetStringValue2(elLetsencrypt, "privatekey");
		if (privkey)
			privkeyL = strlen(privkey);
	}
	if (fullchainL != 0 && privkeyL != 0) {
		FILE *fpC = fopen(ADMIN_PATH "letsencrypt/fullchain.pem", "w");
		if (fpC) {
			fwrite(fullchain, fullchainL, 1, fpC);
			fclose(fpC);
		}
		FILE *fpK = fopen(ADMIN_PATH "letsencrypt/privkey.pem", "w");
		if (fpK) {
			fwrite(privkey, privkeyL, 1, fpK);
			fclose(fpK);
		}
	} else {
		copyFile("/usr/local/modules/apache2/self-fullchain.pem", ADMIN_PATH "letsencrypt/fullchain.pem", NULL);
		copyFile("/usr/local/modules/apache2/self-privkey.pem", ADMIN_PATH "letsencrypt/privkey.pem", NULL);
	}
	cJSON * elBetterauth = cJSON_GetObjectItem(elSetup1, "betterauth");
	char buf[1024];
	char *post = cJSON_Print(elBetterauth);
	downloadURLBuffer("http://localhost:8091/auth/sign-up/email", buf, "Content-Type: application/json", post, NULL, NULL);
	free(post);
	cJSON *modulesDefault = jsonRead(WEB_PATH "assets/modulesdefault.json");
	cJSON *modules = jsonRead(ADMIN_PATH "_config_/_modules_.json");
	if (modules == NULL)
		modules = cJSON_CreateObject();
	cJSON *elModule;
	int total = 1;
	cJSON_ArrayForEach(elModule, modulesDefault)
		if ((cJSON_IsTrue(cJSON_GetObjectItem(elModule, "setup")) && cJSON_HasObjectItem(elModule, "setupPriority") == 1))
			total++;
	int i = 1;
	cJSON *fqdn = fqdnInit(elCloud);
	setupLoop(&i, total, elCloud, modulesDefault, modules, fqdn, 1);
	jsonWrite(modules, ADMIN_PATH "_config_/_modules_.json");
	logicSetup(L("Finalization"), 100);
	cJSON_Delete(fqdn);
	cJSON_Delete(modules);
	cJSON_Delete(modulesDefault);
	buzzer(1);
	if (doSetup2)
		cloudSetup2();
	else {
		cJSON_SetStringValue3(elCloud, "info", "setup", "done1");
		jsonWrite(elCloud, ADMIN_PATH "_config_/_cloud_.json");
		cloudInit_();
		logicMessage(1, 1);
		inSetup = 0;
	}
}

void cloudSetup2() {
	cJSON *elCloud = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
	char *setupStatus = cJSON_GetStringValue3(elCloud, "info", "setup");
	if (strcmp(setupStatus, "done2") == 0) {
		PRINTF("cloudSetup2: Doing nothing\n");
		cJSON_Delete(elCloud);
		return;
	}
	inSetup = 1;
	cJSON_SetStringValue3(elCloud, "info", "setup", "progress2");
	jsonWrite(elCloud, ADMIN_PATH "_config_/_cloud_.json");
	cJSON *modulesDefault = jsonRead(WEB_PATH "assets/modulesdefault.json");
	cJSON *modules = jsonRead(ADMIN_PATH "_config_/_modules_.json");
	cJSON *fqdn = fqdnInit(elCloud);
	cJSON *elModule;
	int total = 1;
	cJSON_ArrayForEach(elModule, modulesDefault)
		if ((cJSON_IsTrue(cJSON_GetObjectItem(elModule, "setup")) && cJSON_HasObjectItem(elModule, "setupPriority") == 0))
			total++;
	int i = 1;
	setupLoop(&i, total, elCloud, modulesDefault, modules, fqdn, 0);
	jsonWrite(modules, ADMIN_PATH "_config_/_modules_.json");
	logicSetup(L("Finalization"), 100);
	cJSON_Delete(fqdn);
	cJSON_Delete(modules);
	cJSON_Delete(modulesDefault);
	cJSON_SetStringValue3(elCloud, "info", "setup", "done2");
	jsonWrite(elCloud, ADMIN_PATH "_config_/_cloud_.json");
	cJSON_Delete(elCloud);
	communicationString("{ \"a\":\"status\", \"progress\":100, \"module\":\"_setup_\", \"state\":\"finish\" }");
	jingle();
	logicMessage(1, 1);
	inSetup = 0;
}
