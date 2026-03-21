#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <unistd.h>
#include <pthread.h>
#include <fcntl.h>
#ifndef WEB
#include <sys/eventfd.h>
#include <linux/input.h>
#include <systemd/sd-bus.h>
#endif
#include "lvgl.h"
#include "macro.h"
#include "common.h"
#include "backend-plat.h"
#include "ui.h"
#include "logic.h"
#include "cJSON.h"
#include "state.h"
#include "modules.h"
#include "diskNotify.h"

//Defines
//from linux/input.h
#define KEY_UP		103
#define KEY_LEFT	105
#define KEY_RIGHT	106
#define KEY_DOWN	108

//Public variable
int doLoop = 0;
int eventFdUI = 0;

//Private variables
static lv_indev_t *indevK;
#ifndef WEB
static struct pollfd pollfd[5];
#endif
static int autoSleep = -1;

//Functions
int backendRotate(int incr) {
#ifdef WEB
	logicMessage(0, 1);
	return -1;
#endif
	state.rotation = (state.rotation + 4 + incr) % 4;
	backendRotate_plat(state.rotation);
	return 0;
}

#ifndef WEB
static void dbus(const char *action) {
	sd_bus *bus = NULL;
	int r = sd_bus_open_system(&bus);
	if (r < 0) {
		PRINTF("Failed to connect to system bus: %s\n", strerror(-r));
		return;
	}
	sd_bus_error error = SD_BUS_ERROR_NULL;
	const char *method_signature = "b";
	bool interactive = false;
	r = sd_bus_call_method( bus, "org.freedesktop.login1", "/org/freedesktop/login1", "org.freedesktop.login1.Manager", action, &error, NULL, "b", false);

	if (r < 0) {
		PRINTF("Failed action %s: %s\n", action, error.message);
		sd_bus_error_free(&error);
	}
	sd_bus_close(bus);
}
#endif

void cleanExit(int todo) {
	PRINTF("cleanExit mode:%d\n", todo);
#ifndef WEB
#ifndef DESKTOP
	sync();
	if (todo == 2)
		dbus("Reboot");
	else if (todo == 1)
		dbus("PowerOff");
#endif
	doLoop = 0;
	logUninit();
#endif
}

static int rotateKey(int k, int ignoreRotation) {
	int ret = 0;
	switch (k) {
	case KEY_LEFT:
		ret = LV_KEY_LEFT;
		break;
	case KEY_RIGHT:
		ret = LV_KEY_RIGHT;
		break;
	case KEY_UP:
		ret = LV_KEY_UP;
		break;
	case KEY_DOWN:
		ret = LV_KEY_DOWN;
		break;
	}
	if (ignoreRotation == 0)
		ret = LV_KEY_UP + ((ret - LV_KEY_UP + state.rotation) % 4);
	//PRINTF("Real:%s -> Virtual:%s\n", k == KEY_LEFT ? "KEY_LEFT": k == KEY_RIGHT ? "KEY_RIGHT": k == KEY_UP ? "KEY_UP": k == KEY_DOWN ? "KEY_DOWN" : "", ret == LV_KEY_LEFT ? "LV_KEY_LEFT": ret == LV_KEY_RIGHT ? "LV_KEY_RIGHT": ret == LV_KEY_UP ? "LV_KEY_UP": ret == LV_KEY_DOWN ? "LV_KEY_DOWN": "");
	return ret;
}

void processButton(int b, int ignoreRotation, int longPress) {
#ifndef WEB
	touchClick();
#endif
	logicKey(rotateKey(b, ignoreRotation), longPress);
}

//UP, DOWN
//RIGHT, LEFT
//keyboard: 65, 66, 67, 68
//KEY_: 103, 108, 106, 105
//LV_KEY_: 17, 18, 19, 20
void processInput(unsigned char c) {
	char szz[128];
	//PRINTF("processInput %d\n", c);
	switch (c) {
	case 65:
		processButton(KEY_UP, 1, 0);
		break;
	case 66:
		processButton(KEY_DOWN, 1, 0);
		break;
	case 67:
		processButton(KEY_RIGHT, 1, 0);
		break;
	case 68:
		processButton(KEY_LEFT, 1, 0);
		break;
	case 70:
		processButton(KEY_DOWN, 1, 1);
		break;
	case 72:
		processButton(KEY_UP, 1, 1);
		break;
	case 'h':
		PRINTF("*******************************************************\n");
		PRINTF("Usage for keyboard input:\n");
		PRINTF("h:	Print help information\n");
		PRINTF("j:	Play jingle\n");
		PRINTF("x:	Exit\n");
		PRINTF("X:	Exit and power off\n");
		PRINTF("Z:	Generate a crash\n");
		PRINTF("*******************************************************\n");
		break;
	case 'j':
		jingle();
		break;
	case 'x':
		cleanExit(0);
		break;
	case 'X':
		cleanExit(1);
		break;
	case 'Z': {
			int *a = NULL;
			*a = 0;
		}
		break;
	default:
		break;
	}
}

void backendInit(int daemon) {
	logicUIThread();
	doLoop = 1;
	if (slaveMode) {
		PRINTF("In SlaveMode\n");
		logicSlaveNotConnected();
	} else
		logicWelcome();
#ifndef WEB
	int fdStdin = -1;
	int fdButton = -1;
	if (!daemon) {
		enterInputMode();
		fdStdin = fileno(stdin);
	}
	eventFdUI = eventfd(0, 0);
#ifndef DESKTOP
	fdButton = open(BUTTON_PATH, O_RDONLY);
#endif
	pollfd[0].fd = fdStdin;
	pollfd[0].events = POLLIN;
	pollfd[1].fd = fdButton;
	pollfd[1].events = POLLIN;
	pollfd[2].fd = eventFdUI;
	pollfd[2].events = POLLIN;
	pollfd[3].fd = diskNotifyStart(ADMIN_PATH "_config_/_modules_.json");
	pollfd[3].events = POLLIN;
	pollfd[4].fd = diskNotifyStart(ADMIN_PATH "_config_/_cloud_.json");
	pollfd[4].events = POLLIN;
#endif
}

static uint32_t tickGet() {
	static struct timespec start = {0};
	if (start.tv_sec == 0)
		clock_gettime(CLOCK_REALTIME, &start);
	struct timespec now;
	clock_gettime(CLOCK_REALTIME, &now);
	int ret = (now.tv_nsec - start.tv_nsec) / 1000 / 1000 + ((now.tv_sec - start.tv_sec) * 1000);
start = now;
	return ret;
}

void backendLoop() {
	lv_tick_inc(tickGet());
	uint32_t time_till_next = lv_timer_handler();
	//PRINTF("Timer: %dms\n", time_till_next);
	if (time_till_next == LV_NO_TIMER_READY)
		time_till_next = LV_DEF_REFR_PERIOD;
#ifdef WEB
	usleep(1000 * time_till_next);
#else
	int ret = poll(pollfd, 5, time_till_next);
	if (doLoop == 0)
		return;
	if (pollfd[0].revents & POLLIN) {
		unsigned char c[2];
		read(pollfd[0].fd, &c, 1);
		if (c[0] != 27 && c[0] != 91)
			processInput(c[0]);
	}
	if (pollfd[1].revents & POLLIN) {
		struct input_event ev[64];
		int rd = read(pollfd[1].fd, ev, sizeof(ev));
		int i;
		for (i = 0; i < rd / sizeof(struct input_event); i++)
			if (ev[i].type == EV_KEY) {
				static int longPressDone = 0;
				if (ev[i].value == 1)
					longPressDone = 0;
				else if (ev[i].value == 2 && longPressDone == 0) {
					processButton(ev[i].code, 0, 1);
					longPressDone = 1;
				} else if (ev[i].value == 0 && longPressDone == 0)
					processButton(ev[i].code, 0, 0);
			}
	}
	if (pollfd[2].revents & POLLIN) {
		unsigned long value;
		read(pollfd[2].fd, &value, sizeof(value));
		logicUpdate();
	}
	if (pollfd[3].revents & POLLIN)
		diskNotifyCB(pollfd[3].fd, &modulesInitA2o);
	if (pollfd[4].revents & POLLIN)
		diskNotifyCB(pollfd[4].fd, &stateLoad);
#endif
	static int count = 0;
	if (count++ % 30 == 0)
		uiUpdate();
	if (autoSleep >= 0) {
		if (autoSleep-- == 0)
			logicSleep(1);
	}
}

void backendUninit(int daemon) {
#ifndef WEB
	if (!daemon)
		leaveInputMode();
#endif
}
