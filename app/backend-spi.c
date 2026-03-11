#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/mman.h>
#include "macro.h"
#include "lvgl.h"
#include "src/drivers/libinput/lv_libinput.h"
#include "backend.h"
#include "cJSON.h"
#include "state.h"
#include "common.h"

//Define
//#define NOMMAP

//Private variable
static unsigned char *fbPublic;

//Functions
static unsigned int convert24to16(unsigned char r, unsigned char g, unsigned char b) {
	return ((r >> 3) << 11) | ((g >> 2) << 5) | ((b >> 3) << 0);
}

static void backendUpdate_plat(lv_disp_t *disp_drv, const lv_area_t *area, unsigned char *colorp) {
	//PRINTF("Update: xy:%dx%d wh:%dx%d\n", area->x1, area->y1, area->x2 - area->x1 + 1, area->y2 - area->y1 + 1);
	int x = area->x1;
	int y = area->y1;
	int w = area->x2 - area->x1 + 1;
	int h = area->y2 - area->y1 + 1;
	int rot = state.rotation;

	char sz[64];
#ifdef NOMMAP
	int xx, yy;
	for (yy = 0; yy < h; yy++)
		for (xx = 0; xx < w; xx++) {
			int pos = DEPTH * (yy * w + xx);
			unsigned int c = convert24to16(fbPublic[pos + 0], fbPublic[pos + 1], fbPublic[pos + 2]);
			sprintf(sz,  "%d %d %d %d %d", x + xx, y + yy, 1, 1, c);
			writeValueKey(SCREEN_PATH, "rect", sz);
		}
#else
	sprintf(sz, "%d %d %d %d", x, y, w, h);
	writeValueKey(SCREEN_PATH, "update", sz);
#endif

    lv_disp_flush_ready(disp_drv);
}

void backendRotate_plat(int rot) {
	writeValueKeyInt(SCREEN_PATH, "rotation", rot);
}

void backendInit_plat(int argc, char *argv[]) {
	lv_init();
#ifndef NOMMAP
	int screenFile = open(SCREEN_FILE, O_RDWR);
	if (screenFile >= 0)
		fbPublic = mmap(NULL, WIDTH * HEIGHT * DEPTH, PROT_WRITE | PROT_READ, MAP_SHARED, screenFile, 0);
	else
#endif
		fbPublic = (unsigned char *)malloc(WIDTH * HEIGHT * DEPTH);
	writeValueKey(SCREEN_PATH, "init", "1");

	lv_display_t *disp = lv_display_create(WIDTH, HEIGHT);
	lv_display_set_buffers(disp, fbPublic, 0, WIDTH * HEIGHT * DEPTH, LV_DISPLAY_RENDER_MODE_PARTIAL);
	lv_display_set_flush_cb(disp, backendUpdate_plat);

	backendRotate_plat(state.rotation);
}

void backendRun_plat() {
	while (doLoop)
		backendLoop();
	PRINTF("End of doLoop\n");
}

void backendUninit_plat() {
	lv_deinit();
}
