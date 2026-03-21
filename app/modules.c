#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/stat.h>
#include "common.h"
#include "macro.h"
#include "cJSON.h"
#include "json.h"
#include "apache2.h"
#include "language.h"
#include "logic.h"
#include "communication.h"
#include "modules.h"
#include "wifi.h"

//Define
#define PERFORMANCE

//Private variables
static pthread_mutex_t modulesMutex = PTHREAD_MUTEX_INITIALIZER;
static int inSetup = 0;
static char ipExternal[48] = "";

//Functions
static cJSON *fqdnInit(cJSON *elCloud) {
	char sz[256];
	cJSON * elCloudAll = cJSON_GetObjectItem(elCloud, "info");
	cJSON *fqdn = cJSON_CreateArray();
	snprintf(sz, sizeof(sz), "%s.%s", cJSON_GetStringValue_(elCloudAll, "name"), MAIN_DOMAIN);
	cJSON *s = NULL;
	s = cJSON_CreateString(sz);
	cJSON_AddItemToArray(fqdn, s);
	snprintf(sz, sizeof(sz), "%s.%s", cJSON_GetStringValue_(elCloudAll, "shortname"), SHORT_DOMAIN);
	s = cJSON_CreateString(sz);
	cJSON_AddItemToArray(fqdn, s);
	char *domain = cJSON_GetStringValue_(elCloudAll, "domain");
	if (domain && strlen(domain) > 0) {
		s = cJSON_CreateString(domain);
		cJSON_AddItemToArray(fqdn, s);
	}
	return fqdn;
}

static void modulesWorkApache2(cJSON *elCloud, cJSON *modulesDefault, cJSON *modules, cJSON *fqdn) {
	mkdir(ADMIN_PATH "apache2", 0775);
	cJSON *elModule2 = cJSON_GetObjectItem(modules, "apache2");
	if (cJSON_IsTrue(cJSON_GetObjectItem(elModule2, "overwrite"))) {
		PRINTF("Apache2: No creation of main.conf\n");
	} else
		buildApache2Conf(elCloud, modulesDefault, modules, fqdn, ipExternal);
#ifndef DESKTOP
	serviceAction("apache2.service", "ReloadOrRestartUnit");
#endif
}

static void modulesWork(cJSON *elCloud, cJSON *modulesDefault, cJSON *modules, cJSON *fqdn) {
	//PRINTF("ModulesWork: Enter\n");
	if (elCloud == NULL || !cJSON_HasObjectItem(elCloud, "info")) {
		buildApache2ConfBeforeSetup();
#ifndef DESKTOP
		serviceAction("apache2.service", "ReloadOrRestartUnit");
#endif
		return;
	}
	cJSON *elModule;
	cJSON_ArrayForEach(elModule, modulesDefault) {
		if (strcmp(elModule->string, "apache2") == 0) {
			modulesWorkApache2(elCloud, modulesDefault, modules, fqdn);
		} else if (strcmp(elModule->string, "frp") == 0) {
			//PRINTF("Modules:frp: Enter\n");
			cJSON *elModule2 = cJSON_GetObjectItem(modules, "frp");
			cJSON *elModule3 = cJSON_GetObjectItem(elCloud, "frp");
			cJSON *elModuleS = NULL, *elModule2S = NULL, *elModule3S = NULL;
			if (elModule)
				elModuleS = cJSON_GetObjectItem(elModule, "protocols");
			if (elModule2)
				elModule2S = cJSON_GetObjectItem(elModule2, "protocols");
			if (elModule3)
				elModule3S = cJSON_GetObjectItem(elModule3, "protocols");
			int	used = 0;
			int port = (int)cJSON_GetNumberValue(cJSON_GetObjectItem(elModule, "bindingPort"));
			mkdir(ADMIN_PATH "frp", 0775);
#ifdef DESKTOP
			FILE *pf = fopen("/tmp/frpc.toml", "w");
#else
			FILE *pf = fopen(ADMIN_PATH "frp/frpc.toml", "w");
#endif
			if (pf) {
				char sz[2048];
				snprintf(sz, sizeof(sz), "\
serverAddr = \"server.maxi.cloud\"\n\
serverPort = %d\n\
auth.method = \"token\"\n\
auth.tokenSource.type = \"file\"\n\
auth.tokenSource.file.path = \"" FRP_PATH "token.txt\"\n\
user = \"%s\"\n\
metadatas.token = \"%s\"\n\
webServer.addr = \"127.0.0.1\"\n\
webServer.port = 7400\n\n", port, cJSON_GetStringValue2(elCloud, "info", "name"), cJSON_GetStringValue_(elModule3, "token"));
				fwrite(sz, strlen(sz), 1, pf);
				for (int t = 0; t < cJSON_GetArraySize(elModuleS); t++) {
					cJSON *elModuleSt = cJSON_GetArrayItem(elModuleS, t);
					cJSON *elModule2St = cJSON_GetObjectItem(elModule2S, elModuleSt->string);
					cJSON *elModule3St = cJSON_GetObjectItem(elModule3S, elModuleSt->string);
					int enabled = 0;
					if (cJSON_IsTrue(cJSON_GetObjectItem(elModule2St, "enabled")))
						enabled = 1;
					else if (cJSON_IsTrue(cJSON_GetObjectItem(elModuleSt, "enabled")))
						enabled = 1;
					if (enabled) {
						used = 1;
						char *type = cJSON_GetStringValue_(elModuleSt, "type");
						int localPort = (int)cJSON_GetNumberValue(cJSON_GetObjectItem(elModuleSt, "localPort"));
						int remotePort = (int)cJSON_GetNumberValue(cJSON_GetObjectItem(elModule3St, "remotePort"));
						sprintf(sz, "\
[[proxies]]\n\
name = \"%s\"\n\
type = \"%s\"\n%s\
localIP = \"localhost\"\n\
localPort = %d\n", elModuleSt->string, type, strncmp(type, "http", 4) == 0 ? "transport.proxyProtocolVersion = \"v2\"\n" : "", localPort);
						fwrite(sz, strlen(sz), 1, pf);
						if (strncmp(type, "http", 4) == 0) {
							strcpy(sz, "customDomains = [\n");
							fwrite(sz, strlen(sz), 1, pf);
							jsonPrintArray(1, "\"", "\"", "", fqdn, "\",\n", pf);
							jsonPrintArray(1, "\"", "\"", "*", fqdn, "\",\n", pf);
							strcpy(sz, "]\n\n");
							fwrite(sz, strlen(sz), 1, pf);
						} else if (strcmp(type, "tcpmux") == 0) {
							snprintf(sz, sizeof(sz), "multiplexer = \"httpconnect\"\ncustomDomains = [ \"%s.%s\" ]\n\n", elModuleSt->string, cJSON_GetStringValue(cJSON_GetArrayItem(fqdn, 0)));
							fwrite(sz, strlen(sz), 1, pf);
						} else if (remotePort > 0) {
							snprintf(sz, sizeof(sz), "remotePort= %d\n\n", remotePort);
							fwrite(sz, strlen(sz), 1, pf);
						}
					}
				}
				fclose(pf);
			}
#ifndef DESKTOP
			serviceAction("frp.service", "RestartUnit");
#endif
		} else {
			if (cJSON_HasObjectItem(elModule, "services")) {
				cJSON *elModule2 = cJSON_GetObjectItem(modules, elModule->string);
				if (cJSON_HasObjectItem(elModule2, "setupDone")) {
					cJSON *elEnabled = cJSON_GetObjectItem(elModule, "enabled");
					if (elModule2 && cJSON_HasObjectItem(elModule2, "enabled"))
						elEnabled = cJSON_GetObjectItem(elModule2, "enabled");
					cJSON *elService;
					cJSON_ArrayForEach(elService, cJSON_GetObjectItem(elModule, "services")) {
						char *service = cJSON_GetStringValue(elService);
						if (serviceState(service) != cJSON_IsTrue(elEnabled)) {
#ifndef DESKTOP
							PRINTF("Should %s %s\n", cJSON_IsTrue(elEnabled) ? "ReloadOrRestartUnit" : "StopUnit", service);
							//serviceAction(service, cJSON_IsTrue(elEnabled) ? "ReloadOrRestartUnit" : "StopUnit");
#endif
						}
					}
				}
			}
		}
	}
}

static void modulesInit_(int apache2Only) {
	if (strlen(ipExternal) == 0) {
		getExternalIP(ipExternal);
		PRINTF("IPExternal: %s\n", ipExternal);
	}
	pthread_mutex_lock(&modulesMutex);
	PRINTF("moduleInit_\n");
	cJSON *cloud = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
	if (cloud == NULL)
		cloud = cJSON_CreateObject();
	cJSON *modulesDefault = jsonRead(WEB_PATH "assets/modulesdefault.json");
	cJSON *modules = jsonRead(ADMIN_PATH "_config_/_modules_.json");
	if (modules == NULL)
		modules = cJSON_CreateObject();
	cJSON *fqdn = fqdnInit(cloud);
	if (apache2Only)
		modulesWorkApache2(cloud, modulesDefault, modules, fqdn);
	else
		modulesWork(cloud, modulesDefault, modules, fqdn);
	cJSON_Delete(fqdn);
	cJSON_Delete(cloud);
	cJSON_Delete(modules);
	cJSON_Delete(modulesDefault);
	pthread_mutex_unlock(&modulesMutex);
}

void modulesInit() {
	if (inSetup)
		return;
	int apache2Only = 0;
	modulesInit_(apache2Only);
}

void modulesInitA2o() {
	if (inSetup)
		return;
	int apache2Only = 1;
	modulesInit_(apache2Only);
}

void moduleSetupDone(char *moduleSt) {
	pthread_mutex_lock(&modulesMutex);
	cJSON *modules = jsonRead(ADMIN_PATH "_config_/_modules_.json");
	if (!cJSON_HasObjectItem(modules, "setupDone")) {
		cJSON *el = cJSON_CreateObject();
		cJSON_AddBoolToObject(el, "setupDone", 1);
		cJSON_AddItemToObject(modules, moduleSt, el);
		jsonWrite(modules, ADMIN_PATH "_config_/_modules_.json");
	}
	cJSON_Delete(modules);
	pthread_mutex_unlock(&modulesMutex);
}

static void setupOne(int i, int total, char *name, int root, cJSON *modules) {
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
						setupOne((*i)++, total, elModuleDep->string, cJSON_HasObjectItem(elModuleDep, "setupRoot"), modules);
						buildApache2Conf(cloud, modulesDefault, modules, fqdn, ipExternal);
#ifndef DESKTOP
						serviceAction("apache2.service", "ReloadOrRestartUnit");
#endif
					}
				}
			}
			int setupAlreadyDone = cJSON_HasObjectItem(modules, elModule->string) && cJSON_IsTrue(cJSON_GetObjectItem(cJSON_GetObjectItem(modules, elModule->string), "setupDone"));
			if (setupAlreadyDone == 0) {
				setupOne((*i)++, total, elModule->string, cJSON_HasObjectItem(elModule, "setupRoot"), modules);
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
		modulesInit();
	}
}

void modulesSetup1(cJSON *elSetup1, int doSetup2) {
	if (inSetup) {
		PRINTF("modulesSetup1 not run because inSetup\n");
		return;
	}
	cJSON *elCheck = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
	if (cJSON_GetArraySize(elCheck) > 0) {
		PRINTF("modulesSetup1 not run because already setup\n");
		cJSON_Delete(elCheck);
		return;
	}
	cJSON_Delete(elCheck);
	inSetup = 1;
	logicSetup(L("Initialization"), 0);
	cJSON *elCloud = cJSON_GetObjectItem(elSetup1, "cloud");
	char *timezone = cJSON_GetStringValue2(elCloud, "hardware", "timezone");
	if (strchr(timezone, '"') == NULL) {
		char sz[256];
		snprintf(sz, sizeof(sz), "sudo /usr/local/modules/_core_/reset.sh -t \"%s\"", timezone);
		system(sz);
	}
	cJSON *elConnectivity = cJSON_GetObjectItem(elSetup1, "connectivity");
	char *ssid = cJSON_GetStringValue2(elConnectivity, "wifi", "ssid");
	char *password = cJSON_GetStringValue2(elConnectivity, "wifi", "password");
	if (ssid && password)
		wiFiAddActivate(ssid, password, &wifiCallback);
	cJSON_SetStringValue2(elCloud, "info", "setup", "progress1");
	jsonWrite(elCloud, ADMIN_PATH "_config_/_cloud_.json");
	mkdir(ADMIN_PATH "letsencrypt", 0775);
	cJSON *elLetsencrypt = cJSON_GetObjectItem(elSetup1, "letsencrypt");
	char *fullchain, *privkey;
	int fullchainL = 0, privkeyL = 0;
	if (elLetsencrypt) {
		fullchain = cJSON_GetStringValue_(elLetsencrypt, "fullchain");
		if (fullchain)
			fullchainL = strlen(fullchain);
		privkey = cJSON_GetStringValue_(elLetsencrypt, "privatekey");
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
		modulesSetup2();
	else {
		cJSON_SetStringValue2(elCloud, "info", "setup", "done1");
		jsonWrite(elCloud, ADMIN_PATH "_config_/_cloud_.json");
		modulesInit_(0);
		logicMessage(1, 1);
		inSetup = 0;
	}
}

void modulesSetup2() {
	cJSON *elCloud = jsonRead(ADMIN_PATH "_config_/_cloud_.json");
	char *setupStatus = cJSON_GetStringValue2(elCloud, "info", "setup");
	if (strcmp(setupStatus, "done2") == 0) {
		PRINTF("modulesSetup2: Doing nothing\n");
		cJSON_Delete(elCloud);
		return;
	}
	inSetup = 1;
	cJSON_SetStringValue2(elCloud, "info", "setup", "progress2");
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
	cJSON_SetStringValue2(elCloud, "info", "setup", "done2");
	jsonWrite(elCloud, ADMIN_PATH "_config_/_cloud_.json");
	cJSON_Delete(elCloud);
	communicationString("{ \"a\":\"status\", \"progress\":100, \"module\":\"_setup_\", \"state\":\"finish\" }");
	jingle();
	logicMessage(1, 1);
	inSetup = 0;
}
