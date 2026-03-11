#ifndef WIFI_H
#define WIFI_H

//Global functions
int wiFiConfigRead(const char *name, char *content);
int wiFiConfigWrite(const char *name, const char *ssid, const char *pwd);
int wiFiAddActivate(const char *ssid, const char *pwd, void (*cb)());
cJSON *wiFiScan();
void wiFiPrint();
int wifiStatus(const char *name, const char *ssid);
int wifiDelete(const char *name, const char *ssid);

#endif
