#ifndef MODULES_H
#define MODULES_H

//Global functions
void modulesWorkApache2(cJSON *elCloud, cJSON *modulesDefault, cJSON *modules, cJSON *fqdn);
void modulesInit();
void moduleSetupDone(char *moduleSt);
void modulesSetup();
void modulesSetup1(cJSON *elSetup1, int doSetup2);
void modulesSetup2();

#endif
