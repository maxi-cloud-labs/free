#ifndef COMMON_H
#define COMMON_H

//Global functions
void readString(const char *path, const char *key, char *buf, int size);
int readValue(const char *path, const char *key);
void readValues2(const char *path, const char *key, int *i, int *j);
void readValues4(const char *path, const char *key, int *i, int *j, int *k, int *l);
void writeString(const char *path, const char *key, char *buf, int size);
void writeValue(const char *path, const char *v);
void writeValueKey(const char *path, const char *key, const char *v);
void writeValueInt(const char *path, int i);
void writeValueInts(const char *path, int i, int j);
void writeValueKeyInt(const char *path, const char *key, int i);
void writeValueKeyInts(const char *path, const char *key, int i, int j);
void writeValueKeyPrintf(const char *path, const char *key, const char *fmt, ...);
int readTemperature();
void enterInputMode();
void leaveInputMode();
void copyFile(char *from, char *to, void (*progresscallback)());
void generateUniqueId(char sz[17]);
void generateRandomHexString(char sz[33]);
int killOtherPids(char *sz);
int fileExists(char *st);
void logInit(int daemon);
void logUninit();
void logUninit();
void buzzer(int n);
void touchClick();
void jingle();
void touch(char *szPath);
int downloadURLBuffer(char *szURL, char *buf, char *header, char *post, char *cookieI, char *cookieO);
int getExternalIP(char *szIPExternal);
int getLocalIP(char *szIPLocal);
void serviceAction(const char *name, const char *action);
int serviceState(const char *name);

#endif
