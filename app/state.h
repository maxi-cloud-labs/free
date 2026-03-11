#ifndef STATE_H
#define STATE_H

//Struct
//#pragma pack(push, 1)
typedef struct stateS {
	uint32_t otp;
	uint32_t storageUsed;//MB
	uint32_t storageTotal;//MB
	uint8_t cpuUsed;//%
	uint8_t memUsed;//%
	uint8_t temperature;//°C
	uint8_t current;
	uint8_t previous;
	uint8_t homePos;
	uint8_t tipsPos;
	uint8_t messageNb;
	uint8_t messageOK;
	uint8_t setupPercentage;
	uint8_t rotation;
	uint8_t sleepKeepLed;
	uint8_t noBuzzer;
	uint8_t setupDone;
	uint8_t language;
} stateS;
//#pragma pack(pop)

//Global variables
extern stateS state;
extern cJSON *stateCloud;

//Global functions
void stateDefault();
void stateDump();
void stateLoad_(char *sz);
void stateLoad();
void updateStateStats();

#endif
