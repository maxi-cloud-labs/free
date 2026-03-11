#ifndef LOGIC_H
#define LOGIC_H

//Struct
//Enum
enum LOGIC_SCREEN {
	LOGIC_WELCOME,
	LOGIC_SLEEP,
	LOGIC_HOME,
	LOGIC_SETUP,
	LOGIC_QR_SETUP,
	LOGIC_QR_LOGIN,
	LOGIC_TIPS,
	LOGIC_SHUTDOWN,
	LOGIC_BYE,
	LOGIC_MESSAGE,
	LOGIC_OTP,
	LOGIC_SLAVENOTCONNECTED
};

//Public variable
extern int slaveMode;

//Functions
void logicUIThread();
void logicUpdate();
void logicKey(int key, int longPress);
void logicWelcome();
void logicSleep(int autoSleep);
void logicHome(int force, int incr);
void logicSetup(char *string, int percentage);
void logicQrSetup();
void logicQrLogin();
void logicTips(int force, int incr);
void logicShutdown();
void logicBye();
void logicMessage(int message, int ok);
void logicOtp(int forceOtp, char *email);
void logicOtpFinished();
void logicSlaveNotConnected();

#endif
