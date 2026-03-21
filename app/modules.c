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

//Private variable
static pthread_mutex_t modulesMutex = PTHREAD_MUTEX_INITIALIZER;

//Functions
cJSON *fqdnInit(cJSON *elCloud) {
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

void modulesInit(cJSON *elCloud, cJSON *modulesDefault, cJSON *modules, char *szIPExternal) {
	//PRINTF("Modules:Setup: Enter\n");
	if (elCloud == NULL || !cJSON_HasObjectItem(elCloud, "info")) {
		buildApache2ConfBeforeSetup();
#ifndef DESKTOP
		serviceAction("apache2.service", "ReloadOrRestartUnit");
#endif
		return;
	}
	//PRINTF("Modules:Setup: Do\n");
	cJSON *fqdn = fqdnInit(elCloud);
	cJSON *elModule;
	cJSON_ArrayForEach(elModule, modulesDefault) {
		if (strcmp(elModule->string, "apache2") == 0) {
			cJSON *elModule2 = cJSON_GetObjectItem(modules, "apache2");
			mkdir(ADMIN_PATH "apache2", 0775);
			if (cJSON_IsTrue(cJSON_GetObjectItem(elModule2, "overwrite"))) {
				PRINTF("Apache2: No creation of main.conf\n");
			} else
				buildApache2Conf(elCloud, modulesDefault, modules, fqdn, szIPExternal);
#ifndef DESKTOP
			serviceAction("apache2.service", "ReloadOrRestartUnit");
#endif
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
	cJSON_Delete(fqdn);
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
