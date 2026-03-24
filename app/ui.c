#include <stdlib.h>
#include <stdio.h>
#include <unistd.h>
#include <time.h>
#include "lvgl.h"
#include "macro.h"
#include "logic.h"
#include "ui.h"
#include "language.h"
#include "cJSON.h"
#include "state.h"

//Defines color
#define COLOR_BACKGROUND 0xffffff
#define COLOR_TEXT 0x101828
#define COLOR_LIGHT 0x0092ce
#define COLOR_DARK 0x013d7b
#define COLOR_EXTRA_DARK 0x011f5d
#define COLOR_WHITE 0xffffff

//Private variable
static char *szTips[] = {
"Press the top right button to access the Login qrcode of the web app.",
"It's recommended to properly shutdown the device with a long press on the top right button.",
"A long press on the top left button will sleep the screen and the led. The dongle will still function.",
"New module are constantly added. Check on the app regularly.",
"You can recover a bricked dongle with the recovery tool (available on Windows, Linux and Mac).",
"Press both bottom buttons at the same time for 10 seconds to reset and delete all the dongle data.",
};

static char *szString[] = {
"Rotation is not supported on the web demo.",
"Congratulations! mAxI is now ready",
};

//Functions
//#define USE_IMG_FILE
#ifdef USE_IMG_FILE
#define img_cloud_error "img/cloud_error.png"
#define img_cloud_ok "img/cloud_ok.png"
#define img_icon_help "img/icon_help.png"
#define img_icon_left "img/icon_left.png"
#define img_icon_right "img/icon_right.png"
#define img_icon_right2 "img/icon_right2.png"
#define img_icon_shutdown "img/icon_shutdown.png"
#define img_icon_sleep "img/icon_sleep.png"
#define img_next "img/next.png"
#define img_ok "img/ok.png"
#define img_qrcode_setup "img/qrcode_setup.png"
#define img_qrcode_login "img/qrcode_login.png"
#define img_qrcode_scanme "img/qrcode_scanme.png"
#define img_reset "img/reset.png"
#define img_rotate "img/rotate.png"
#define img_temperature_error "img/temperature_error.png"
#define img_temperature_ok "img/temperature_ok.png"
#define img_temperature_warning "img/temperature_warning.png"
#define img_wait "img/wait.png"
#define img_wifi_error "img/wifi_error.png"
#define img_wifi_ok "img/wifi_ok.png"
#else
#include "img/cloud_error.h"
#include "img/cloud_ok.h"
#include "img/icon_help.h"
#include "img/icon_left.h"
#include "img/icon_right.h"
#include "img/icon_right2.h"
#include "img/icon_shutdown.h"
#include "img/icon_sleep.h"
#include "img/next.h"
#include "img/ok.h"
#include "img/qrcode_setup.h"
#include "img/qrcode_login.h"
#include "img/qrcode_scanme.h"
#include "img/reset.h"
#include "img/rotate.h"
#include "img/temperature_error.h"
#include "img/temperature_ok.h"
#include "img/temperature_warning.h"
#include "img/wait.h"
#include "img/wifi_error.h"
#include "img/wifi_ok.h"
#endif

static void set_angle(void *obj, int32_t v) {
	lv_arc_set_value((lv_obj_t *)obj, v);
}

static void arc(int x, int y, int s, int p) {
	lv_obj_t *arc = lv_arc_create(lv_screen_active());
	lv_arc_set_bg_angles(arc, 271, 270);
	lv_arc_set_value(arc, p);
	lv_obj_set_size(arc, s, s);
	lv_obj_set_pos(arc, x, y);
	lv_obj_remove_style(arc, NULL, LV_PART_KNOB);
	lv_obj_remove_flag(arc, LV_OBJ_FLAG_CLICKABLE);
	lv_obj_set_style_arc_color(arc, lv_color_hex(COLOR_LIGHT), LV_PART_MAIN);
	lv_obj_set_style_arc_color(arc, lv_color_hex(COLOR_DARK), LV_PART_INDICATOR);
	lv_obj_set_style_arc_width(arc, 5, LV_PART_MAIN);
	lv_obj_set_style_arc_width(arc, 5, LV_PART_INDICATOR);
}

static void circulaText(char *sz, int x, int y, int s) {
	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_long_mode(label0, LV_LABEL_LONG_MODE_SCROLL_CIRCULAR);
	lv_obj_set_pos(label0 , x, y);
	lv_obj_set_width(label0, s);
	lv_label_set_text(label0, sz);
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);

	static lv_style_t labelStyle;
	if (labelStyle.prop_cnt == 0)
		lv_style_init(&labelStyle);
	lv_style_set_text_font(&labelStyle, &lv_font_montserrat_12);
	lv_obj_add_style(label0, &labelStyle, LV_STATE_DEFAULT);
}

static void eventHandler(lv_event_t *e) {
	lv_event_code_t code = lv_event_get_code(e);
	if(code == LV_EVENT_CLICKED) {
		lv_obj_t *btn = lv_event_get_current_target(e);
		int key = (int)(unsigned long)lv_obj_get_user_data(btn);
		int longPress = lv_obj_get_y(btn) == 12;
		logicKey(key, longPress);
	}
}

static void buttonImg(int key, int longPress, const void *arg) {
	int posx, posy;
	if (longPress && key == LV_KEY_UP) {
		posx = 1;
		posy = 12;
	} else if (longPress && key == LV_KEY_DOWN) {
		posx = 117;
		posy = 12;
	} else if (key == LV_KEY_UP) {
		posx = 1;
		posy = 1;
	} else if (key == LV_KEY_DOWN) {
		posx = 117;
		posy = 1;
	}

	lv_obj_t *btn0 = lv_imgbtn_create(lv_screen_active());
	lv_imgbtn_set_src(btn0, LV_IMGBTN_STATE_RELEASED, NULL, arg, NULL);
	lv_obj_set_user_data(btn0, (void *)(unsigned long)key);
	lv_obj_set_pos(btn0, posx, posy);

	static lv_style_t btn0StylePressed;
	if (btn0StylePressed.prop_cnt == 0)
		lv_style_init(&btn0StylePressed);
	lv_style_set_img_recolor_opa(&btn0StylePressed, LV_OPA_30);
	lv_style_set_img_recolor(&btn0StylePressed, lv_color_black());
	lv_obj_add_style(btn0, &btn0StylePressed, LV_STATE_PRESSED);

	lv_obj_add_event_cb(btn0, eventHandler, LV_EVENT_ALL, NULL);
}

static void button(int pos, char *sz, const void *arg) {
	int posx, posy;
	if (pos == LV_KEY_LEFT) {
		posx = 1;
		posy = 112;
	} else if (pos == LV_KEY_RIGHT) {
		posx = 78;
		posy = 112;
	} else if (pos == LV_KEY_DOWN) {
		posx = 78;
		posy = 2;
	} else if (pos == LV_KEY_UP) {
		posx = 1;
		posy = 2;
	}

	lv_obj_t *btn0 = lv_button_create(lv_screen_active());
	lv_obj_set_user_data(btn0, (void *)(unsigned long)pos);
	lv_obj_set_pos(btn0, posx, posy);
	lv_obj_set_size(btn0, 49, 14);
	static lv_style_t btnStyle;
	if (btnStyle.prop_cnt == 0)
		lv_style_init(&btnStyle);
	lv_style_set_bg_color(&btnStyle, lv_color_hex(COLOR_DARK));
	lv_style_set_radius(&btnStyle, 4);
	lv_obj_add_style(btn0, &btnStyle, 0);
	lv_obj_add_event_cb(btn0, eventHandler, LV_EVENT_ALL, NULL);

	lv_obj_t *labelBtn0 = lv_label_create(btn0);
	lv_label_set_text(labelBtn0, sz);
	static lv_style_t labelStyleBtn0;
	if (labelStyleBtn0.prop_cnt == 0)
		lv_style_init(&labelStyleBtn0);
	lv_style_set_text_font(&labelStyleBtn0, &lv_font_montserrat_12);
	lv_style_set_text_color(&labelStyleBtn0, lv_color_hex(COLOR_WHITE));
	lv_obj_add_style(labelBtn0, &labelStyleBtn0, LV_STATE_DEFAULT);
	lv_obj_align_to(labelBtn0, btn0, LV_ALIGN_BOTTOM_MID, arg != NULL ? 6 : 0, 8);

	if (arg) {
		lv_obj_t *imgBtn0 = lv_image_create(lv_screen_active());
		lv_img_set_src(imgBtn0, arg);
		lv_obj_set_pos(imgBtn0, posx + 5, posy + 2);
	}
}

static void advancement(int pos) {
	static lv_style_t btnStyle;
	if (btnStyle.prop_cnt == 0)
		lv_style_init(&btnStyle);
	lv_style_set_bg_color(&btnStyle, lv_color_hex(COLOR_DARK));
	lv_style_set_shadow_width(&btnStyle, 0);
	int x, y, s;

	x = 53;
	y = 118;
	s = 3;
	if (pos == 0) {
		s = 6;
		x -= 1;
		y -= 2;
	}
	lv_obj_t *btn0 = lv_button_create(lv_screen_active());
	lv_obj_set_pos(btn0, x, y);
	lv_obj_set_size(btn0, s, s);
	lv_obj_add_style(btn0, &btnStyle, 0);

	x = 59;
	y = 118;
	s = 3;
	if (pos == 1) {
		s = 6;
		x -= 1;
		y -= 2;
	}
	lv_obj_t *btn1 = lv_button_create(lv_screen_active());
	lv_obj_set_pos(btn1, x, y);
	lv_obj_set_size(btn1, s, s);
	lv_obj_add_style(btn1, &btnStyle, 0);

	x = 65;
	y = 118;
	s = 3;
	if (pos == 2) {
		s = 6;
		x -= 1;
		y -= 2;
	}
	lv_obj_t *btn2 = lv_button_create(lv_screen_active());
	lv_obj_set_pos(btn2, x, y);
	lv_obj_set_size(btn2, s, s);
	lv_obj_add_style(btn2, &btnStyle, 0);

	x = 71;
	y = 118;
	s = 3;
	if (pos == 3) {
		s = 6;
		x -= 1;
		y -= 2;
	}
	lv_obj_t *btn3 = lv_button_create(lv_screen_active());
	lv_obj_set_pos(btn3, x, y);
	lv_obj_set_size(btn3, s, s);
	lv_obj_add_style(btn3, &btnStyle, 0);

}

static lv_obj_t *labelTime;
static void uiBarTime() {
	char sz[128];
	time_t timer;
	time(&timer);
	struct tm *tm_info = localtime(&timer);
	strftime(sz, 26, "%H:%M:%S\n%d %b", tm_info);
	lv_label_set_text(labelTime, sz);
}

static void uiBar() {
	lv_obj_t *rect = lv_obj_create(lv_screen_active());
	lv_obj_set_size(rect , 128, 23);
	lv_obj_set_pos(rect , 0, 0);
	lv_obj_set_style_bg_color(rect, lv_color_hex(COLOR_DARK), LV_PART_MAIN);
	lv_obj_set_style_radius(rect, 0, LV_PART_MAIN);
	lv_obj_set_style_border_width(rect, 0, LV_PART_MAIN | LV_STATE_DEFAULT);
	lv_obj_remove_flag(rect, LV_OBJ_FLAG_SCROLLABLE);

	buttonImg(LV_KEY_UP, 0, &img_icon_left);
	buttonImg(LV_KEY_DOWN, 0, &img_icon_right);
	buttonImg(LV_KEY_UP, 1, &img_icon_sleep);
	buttonImg(LV_KEY_DOWN, 1, &img_icon_shutdown);

	lv_obj_t *imgBar0 = lv_image_create(lv_screen_active());
	lv_img_set_src(imgBar0, &img_wifi_ok);
	lv_obj_set_pos(imgBar0, 14, 2);
	lv_obj_t *imgBar1 = lv_image_create(lv_screen_active());
	lv_img_set_src(imgBar1, &img_cloud_ok);
	lv_obj_set_pos(imgBar1, 34, 2);
	lv_obj_t *imgBar2 = lv_image_create(lv_screen_active());
	lv_img_set_src(imgBar2, &img_temperature_ok);
	lv_obj_set_pos(imgBar2, 52, 2);

	labelTime = lv_label_create(lv_screen_active());
	lv_obj_set_pos(labelTime, 66, 0);
	lv_obj_set_size(labelTime , 50, 24);
	static lv_style_t labelStyle1;
	if (labelStyle1.prop_cnt == 0)
		lv_style_init(&labelStyle1);
	lv_style_set_text_font(&labelStyle1, &lv_font_montserrat_10);
	lv_style_set_text_color(&labelStyle1, lv_color_hex(COLOR_WHITE));
	lv_obj_add_style(labelTime, &labelStyle1, LV_STATE_DEFAULT);
	lv_obj_set_style_text_align(labelTime, LV_TEXT_ALIGN_CENTER, 0);

	uiBarTime();
}

void uiScreenInit() {
	lv_obj_set_style_bg_color(lv_screen_active(), lv_color_hex(COLOR_BACKGROUND), LV_PART_MAIN);
	lv_obj_set_style_text_color(lv_screen_active(), lv_color_hex(COLOR_TEXT), LV_PART_MAIN);
}

void uiScreenWelcome() {
	lv_obj_clean(lv_screen_active());
	uiBar();

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L("Welcome!"));
	lv_obj_set_width(label0, 128);
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_align(label0, LV_ALIGN_TOP_LEFT, 0, 27);

	lv_obj_t *label1 = lv_label_create(lv_screen_active());
	lv_label_set_text(label1, L("Use the buttons (except OK) to rotate the screen."));
	lv_obj_set_width(label1, 128);
	lv_obj_set_style_text_align(label1, LV_TEXT_ALIGN_CENTER, 0);
	static lv_style_t labelStyle1;
	if (labelStyle1.prop_cnt == 0)
		lv_style_init(&labelStyle1);
	lv_style_set_text_font(&labelStyle1, &lv_font_montserrat_10);
	lv_obj_add_style(label1, &labelStyle1, LV_STATE_DEFAULT);
	lv_obj_align(label1, LV_ALIGN_TOP_LEFT, 0, 46);

	lv_obj_t *label2 = lv_label_create(lv_screen_active());
	lv_label_set_text(label2, L("Press long on the top buttons to turn off the screen or shutdown."));
	lv_obj_set_width(label2, 128);
	lv_obj_set_style_text_align(label2, LV_TEXT_ALIGN_CENTER, 0);
	static lv_style_t labelStyle2;
	if (labelStyle2.prop_cnt == 0)
		lv_style_init(&labelStyle2);
	lv_style_set_text_font(&labelStyle2, &lv_font_montserrat_10);
	lv_obj_add_style(label2, &labelStyle2, LV_STATE_DEFAULT);
	lv_obj_align(label2, LV_ALIGN_TOP_LEFT, 0, 73);

	button(LV_KEY_LEFT, L("Rot."), &img_icon_right2);
	button(LV_KEY_RIGHT, L("OK"), NULL);
}

void uiScreenSleep() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L("Sleeping..."));
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_set_width(label0, 128);
	lv_obj_center(label0);

	button(LV_KEY_RIGHT, L("Exit"), NULL);
}

static void doubleText(char *sz, char *sz2, int y, int x2) {
	if (sz == NULL) {
		static lv_style_t labelStyle1;
		if (labelStyle1.prop_cnt == 0)
				lv_style_init(&labelStyle1);
		lv_style_set_text_font(&labelStyle1, &lv_font_montserrat_10);
		lv_style_set_text_decor(&labelStyle1, LV_TEXT_DECOR_UNDERLINE);
		lv_style_set_text_color(&labelStyle1, lv_color_hex(COLOR_LIGHT));

		lv_obj_t *label1 = lv_label_create(lv_screen_active());
		lv_label_set_long_mode(label1, LV_LABEL_LONG_MODE_SCROLL_CIRCULAR);
		lv_obj_set_width(label1, WIDTH - 8);
		lv_label_set_text(label1, sz2);
		lv_obj_set_pos(label1, 4, y);
		lv_obj_add_style(label1, &labelStyle1, LV_STATE_DEFAULT);
	} else {
		static lv_style_t labelStyle0;
		if (labelStyle0.prop_cnt == 0)
				lv_style_init(&labelStyle0);
		lv_style_set_text_font(&labelStyle0, &lv_font_montserrat_10);
		//lv_style_set_text_color(&labelStyle0, lv_color_hex(COLOR_LIGHT));

		lv_obj_t *label0 = lv_label_create(lv_screen_active());
		lv_label_set_text(label0, sz);
		lv_obj_add_style(label0, &labelStyle0, LV_STATE_DEFAULT);
		lv_obj_set_pos(label0, 4, y);

		static lv_style_t labelStyle1;
		if (labelStyle1.prop_cnt == 0)
				lv_style_init(&labelStyle1);
		lv_style_set_text_font(&labelStyle1, &lv_font_montserrat_10);
		lv_style_set_text_color(&labelStyle1, lv_color_hex(COLOR_LIGHT));

		lv_obj_t *label1 = lv_label_create(lv_screen_active());
		lv_label_set_text(label1, sz2);
		lv_obj_add_style(label1, &labelStyle1, LV_STATE_DEFAULT);
		lv_obj_set_pos(label1, x2, y);
	}
}

static void progressBar(int w, int y, char *sz, char *sz2, int p) {
	doubleText(sz, sz2, y, 45);

	static lv_style_t style_bg;
	if (style_bg.prop_cnt == 0)
		lv_style_init(&style_bg);
	lv_style_set_border_color(&style_bg, lv_color_hex(COLOR_DARK));
	lv_style_set_border_width(&style_bg, 1);
	lv_style_set_pad_all(&style_bg, 2);
	lv_style_set_radius(&style_bg, 3);
	static lv_style_t style_indic;
	if (style_indic.prop_cnt == 0)
		lv_style_init(&style_indic);
	lv_style_set_bg_opa(&style_indic, LV_OPA_COVER);
	lv_style_set_bg_color(&style_indic, lv_color_hex(COLOR_LIGHT));
	lv_style_set_bg_grad_color(&style_indic, lv_palette_main(LV_PALETTE_RED));
	lv_style_set_bg_grad_dir(&style_indic, LV_GRAD_DIR_HOR);
	lv_style_set_radius(&style_indic, 2);
	lv_obj_t * bar = lv_bar_create(lv_screen_active());
	lv_obj_remove_style_all(bar);
	lv_obj_add_style(bar, &style_bg, LV_PART_MAIN);
	lv_obj_add_style(bar, &style_indic, LV_PART_INDICATOR);
	lv_obj_set_size(bar, w, 8);
	lv_bar_set_value(bar, p, LV_ANIM_ON);
	lv_obj_set_pos(bar, (128 - w) / 2, y + 13);
}

void uiScreenHome() {
	lv_obj_clean(lv_screen_active());
	uiBar();

	if (state.homePos == 0) {
		char sz[32];

		lv_obj_t *label0 = lv_label_create(lv_screen_active());
		lv_label_set_text(label0, L("Storage"));
		lv_obj_set_width(label0, 60);
		lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
		lv_obj_set_pos(label0, 2, 26);
		static lv_style_t labelStyle0;
		if (labelStyle0.prop_cnt == 0)
			lv_style_init(&labelStyle0);
		lv_style_set_text_font(&labelStyle0, &lv_font_montserrat_14);
		lv_obj_add_style(label0, &labelStyle0, LV_STATE_DEFAULT);

		arc(10, 46, 44, state.storageUsed * 100 / state.storageTotal);

		sprintf(sz, "%d%%", state.storageUsed * 100 / state.storageTotal);
		lv_obj_t *label1 = lv_label_create(lv_screen_active());
		lv_label_set_text(label1, sz);
		lv_obj_set_width(label1, 40);
		lv_obj_set_style_text_align(label1, LV_TEXT_ALIGN_CENTER, 0);
		lv_obj_set_pos(label1, 12, 60);
		static lv_style_t labelStyle1;
		if (labelStyle1.prop_cnt == 0)
			lv_style_init(&labelStyle1);
		lv_style_set_text_font(&labelStyle1, &lv_font_montserrat_14);
		lv_obj_add_style(label1, &labelStyle1, LV_STATE_DEFAULT);

		sprintf(sz, "%dGB/%dTB", state.storageUsed / 1000, state.storageTotal / 1000 / 1000);
//		circulaText(sz, 2, 95, 60);
		lv_obj_t *label2 = lv_label_create(lv_screen_active());
		lv_label_set_text(label2, sz);
		lv_obj_set_width(label2, 60);
		lv_obj_set_style_text_align(label2, LV_TEXT_ALIGN_CENTER, 0);
		lv_obj_set_pos(label2, 2, 95);
		static lv_style_t labelStyle2;
		if (labelStyle2.prop_cnt == 0)
			lv_style_init(&labelStyle2);
		lv_style_set_text_font(&labelStyle2, &lv_font_montserrat_10);
		lv_obj_add_style(label2, &labelStyle2, LV_STATE_DEFAULT);

		lv_obj_t *label3 = lv_label_create(lv_screen_active());
		lv_label_set_text(label3, L("Health"));
		lv_obj_set_width(label3, 60);
		lv_obj_set_style_text_align(label3, LV_TEXT_ALIGN_CENTER, 0);
		lv_obj_set_pos(label3, 66, 26);
		static lv_style_t labelStyle3;
		if (labelStyle3.prop_cnt == 0)
				lv_style_init(&labelStyle3);
		lv_style_set_text_font(&labelStyle3, &lv_font_montserrat_14);
		lv_obj_add_style(label3, &labelStyle3, LV_STATE_DEFAULT);

		arc(74, 46, 44, 80);

		sprintf(sz, "%d%%", 90);
		lv_obj_t *label4 = lv_label_create(lv_screen_active());
		lv_label_set_text(label4, sz);
		lv_obj_set_width(label4, 40);
		lv_obj_set_style_text_align(label4, LV_TEXT_ALIGN_CENTER, 0);
		lv_obj_set_pos(label4, 76, 60);
		static lv_style_t labelStyle4;
		if (labelStyle4.prop_cnt == 0)
			lv_style_init(&labelStyle4);
		lv_style_set_text_font(&labelStyle4, &lv_font_montserrat_14);
		lv_obj_add_style(label4, &labelStyle4, LV_STATE_DEFAULT);

		sprintf(sz, L("%d warnings"), 2);
		lv_obj_t *label5 = lv_label_create(lv_screen_active());
		lv_label_set_text(label5, sz);
		lv_obj_set_width(label5, 60);
		lv_obj_set_style_text_align(label5, LV_TEXT_ALIGN_CENTER, 0);
		lv_obj_set_pos(label5, 66, 95);
		static lv_style_t labelStyle5;
		if (labelStyle5.prop_cnt == 0)
				lv_style_init(&labelStyle5);
		lv_style_set_text_font(&labelStyle5, &lv_font_montserrat_10);
		lv_obj_add_style(label5, &labelStyle5, LV_STATE_DEFAULT);
	} else if (state.homePos == 1) {
		char *primary = cJSON_GetStringValue2(stateCloud, "info", "primary");
		char *shortname = cJSON_GetStringValue2(stateCloud, "info", "shortname");
		char *serial = cJSON_GetStringValue2(stateCloud, "hardware", "serial");
		char *internalIP = cJSON_GetStringValue2(stateCloud, "hardware", "internalIP");
		char *externalIP = cJSON_GetStringValue2(stateCloud, "hardware", "externalIP");
		char sz[128];
		snprintf(sz, 128, "%.8s...", serial);
		doubleText(L("Serial"), sz, 28, 50);
		snprintf(sz, 128, "https://%s", primary);
		doubleText(NULL, sz, 42, 50);
		snprintf(sz, 128, "https://%s.maxi.cloud", shortname);
		doubleText(NULL, sz, 56, 50);
		doubleText(L("Wi-Fi"), "XXXXX", 70, 50);
		doubleText(L("Local"), internalIP, 84, 50);
		doubleText(L("Extern"), externalIP, 98, 50);
	} else if (state.homePos == 2) {
		char sz[32];
		sprintf(sz, "%d%%, %d°C", state.cpuUsed, state.temperature);
		progressBar(120, 28, L("CPU"), sz, state.cpuUsed);

		sprintf(sz, "%d%%, %d proc", state.memUsed, 145);
		progressBar(120, 54, L("Mem"), sz, state.memUsed);

		sprintf(sz, "%d%%, %dGB/%dTB", state.storageUsed * 100 / state.storageTotal, state.storageUsed / 1000, state.storageTotal / 1000 / 1000);
		progressBar(120, 82, L("Disk"), sz, state.storageUsed * 100 / state.storageTotal);
	} else if (state.homePos == 3) {
		doubleText("Port https (443)", "OK", 28, 100);
		doubleText("Port mail (25)", "OK", 42, 100);
		doubleText("Port pop3s (995)", "OK", 56, 100);
		doubleText("Port imaps (993)", "OK", 70, 100);
		doubleText("Port smtps (465)", "OK", 84, 100);
	}

	button(LV_KEY_LEFT, L("Tips"), NULL);
	button(LV_KEY_RIGHT, L("Next"), NULL);
	advancement(state.homePos);
}

void uiScreenSetup() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t * spinner = lv_spinner_create(lv_screen_active());
	static lv_style_t arcStyle0;
	if (arcStyle0.prop_cnt == 0)
		lv_style_init(&arcStyle0);
	lv_style_set_arc_width(&arcStyle0, 5);
	lv_style_set_arc_color(&arcStyle0, lv_color_hex(COLOR_DARK));
	static lv_style_t arcStyle1;
	if (arcStyle1.prop_cnt == 0)
		lv_style_init(&arcStyle1);
	lv_style_set_arc_width(&arcStyle1, 5);
	lv_style_set_arc_color(&arcStyle1, lv_color_hex(COLOR_LIGHT));
	lv_obj_set_size(spinner, 50, 50);
	lv_obj_center(spinner);
	lv_spinner_set_anim_params(spinner, 1000, 200);
	lv_obj_add_style(spinner, &arcStyle0, LV_PART_INDICATOR);
	lv_obj_add_style(spinner, &arcStyle1, LV_PART_MAIN);

	char sz[8];
	sprintf(sz, L("%d%%"), state.setupPercentage);
	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, sz);
	lv_obj_set_width(label0, 128);
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_center(label0);
	static lv_style_t labelStyle0;
	if (labelStyle0.prop_cnt == 0)
		lv_style_init(&labelStyle0);
	lv_style_set_text_font(&labelStyle0, &lv_font_montserrat_16);
	lv_obj_add_style(label0, &labelStyle0, LV_STATE_DEFAULT);

	lv_obj_t *label1 = lv_label_create(lv_screen_active());
	lv_label_set_text(label1, L("Setup"));
	lv_obj_set_width(label1, 128);
	lv_obj_set_style_text_align(label1, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_set_pos(label1, 0, 2);
	static lv_style_t labelStyle1;
	if (labelStyle1.prop_cnt == 0)
		lv_style_init(&labelStyle1);
	lv_obj_add_style(label1, &labelStyle1, LV_STATE_DEFAULT);

	lv_obj_t *label2 = lv_label_create(lv_screen_active());
	if (state.setupPercentage == 0)
		lv_label_set_text(label2, L("Starting procedure"));
	else if (state.setupPercentage == 0)
		lv_label_set_text(label2, L("Finishing process"));
	else
		lv_label_set_text(label2, L("Preparing module"));
	lv_obj_set_width(label2, 128);
	lv_obj_set_style_text_align(label2, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_set_pos(label2, 0, 20);
	static lv_style_t labelStyle2;
	if (labelStyle2.prop_cnt == 0)
		lv_style_init(&labelStyle2);
	lv_style_set_text_font(&labelStyle2, &lv_font_montserrat_12);
	lv_obj_add_style(label2, &labelStyle2, LV_STATE_DEFAULT);

	lv_obj_t *label3 = lv_label_create(lv_screen_active());
#ifdef WEB
	lv_label_set_text(label3, "module");
#else
extern char *string_;
	lv_label_set_text(label3, string_);
#endif
	lv_obj_set_width(label3, 128);
	lv_obj_set_style_text_align(label3, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_set_pos(label3, 0, 92);
	static lv_style_t labelStyle3;
	if (labelStyle3.prop_cnt == 0)
		lv_style_init(&labelStyle3);
	lv_style_set_text_font(&labelStyle3, &lv_font_montserrat_12);
	lv_obj_add_style(label3, &labelStyle3, LV_STATE_DEFAULT);

	lv_obj_t *label4 = lv_label_create(lv_screen_active());
	lv_label_set_text(label4, L("Please wait..."));
	lv_obj_set_width(label4, 128);
	lv_obj_set_style_text_align(label4, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_set_pos(label4, 0, 110);
}

void uiScreenQrSetup() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t *imgNav0 = lv_image_create(lv_screen_active());
	lv_img_set_src(imgNav0, &img_qrcode_scanme);
	lv_obj_set_pos(imgNav0, 2, 2);
	lv_obj_t *imgNav1 = lv_image_create(lv_screen_active());
	lv_img_set_src(imgNav1, &img_qrcode_login);
	lv_obj_set_pos(imgNav1, 39, 14);

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L("Setup"));
	lv_obj_set_pos(label0, 3, 114);
	static lv_style_t labelStyle0;
	if (labelStyle0.prop_cnt == 0)
		lv_style_init(&labelStyle0);
	lv_style_set_text_font(&labelStyle0, &lv_font_montserrat_10);
	lv_obj_add_style(label0, &labelStyle0, LV_STATE_DEFAULT);

	button(LV_KEY_RIGHT, L("Done"), NULL);
}

void uiScreenQrLogin() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t *imgNav0 = lv_image_create(lv_screen_active());
	lv_img_set_src(imgNav0, &img_qrcode_scanme);
	lv_obj_set_pos(imgNav0, 2, 2);
	lv_obj_t *imgNav1 = lv_image_create(lv_screen_active());
	lv_img_set_src(imgNav1, &img_qrcode_login);
	lv_obj_set_pos(imgNav1, 39, 14);

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L("Login "));
	lv_obj_set_pos(label0, 3, 114);
	static lv_style_t labelStyle0;
	if (labelStyle0.prop_cnt == 0)
		lv_style_init(&labelStyle0);
	lv_style_set_text_font(&labelStyle0, &lv_font_montserrat_10);
	lv_obj_add_style(label0, &labelStyle0, LV_STATE_DEFAULT);

	button(LV_KEY_RIGHT, L("Done"), NULL);
}

void uiScreenTips() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L(szTips[state.tipsPos]));
	lv_obj_set_width(label0, 128);
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	static lv_style_t labelStyle0;
	if (labelStyle0.prop_cnt == 0)
		lv_style_init(&labelStyle0);
	lv_style_set_text_font(&labelStyle0, &lv_font_montserrat_12);
	lv_obj_add_style(label0, &labelStyle0, LV_STATE_DEFAULT);
	lv_obj_center(label0);

	lv_obj_t *label1 = lv_label_create(lv_screen_active());
	char sz2[16];
	int total = sizeof(szTips)/sizeof(szTips[0]);
	sprintf(sz2, "%d/%d", state.tipsPos + 1, total);
	lv_label_set_text(label1, sz2);
	lv_obj_set_width(label1, 128);
	lv_obj_set_style_text_align(label1, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_align(label1, LV_ALIGN_BOTTOM_LEFT, 0, -3);
	static lv_style_t labelStyle1;
	if (labelStyle1.prop_cnt == 0)
		lv_style_init(&labelStyle1);
	lv_style_set_text_font(&labelStyle1, &lv_font_montserrat_10);
	lv_obj_add_style(label1, &labelStyle1, LV_STATE_DEFAULT);

	button(LV_KEY_UP, L("Back"), NULL);
	if (state.tipsPos == 0)
		button(LV_KEY_DOWN, L("Login"), NULL);
	button(LV_KEY_LEFT, L("Prev."), NULL);
	button(LV_KEY_RIGHT, L("Next"), NULL);
}

void uiScreenShutdown() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L("Are you sure to shutdown the dongle?"));
	lv_obj_set_width(label0, 128);
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_center(label0);

	button(LV_KEY_LEFT, L("No"), NULL);
	button(LV_KEY_RIGHT, L("Yes"), NULL);
}

void uiScreenBye() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L("Bye now!\nPlease be patient for a clean shutdown"));
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_set_width(label0, 90);
	lv_obj_center(label0);
}

void uiScreenMessage() {
	lv_obj_clean(lv_screen_active());

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L(szString[state.messageNb]));
	lv_obj_set_width(label0, 128);
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_center(label0);

	if (state.messageOK)
		button(LV_KEY_RIGHT, L("OK"), NULL);
}

void uiScreenOtp(int expiration) {
	static struct timespec start;
	if (expiration != -1) {
		clock_gettime(CLOCK_REALTIME, &start);
		start.tv_sec += expiration;
	}
	struct timespec now;
	clock_gettime(CLOCK_REALTIME, &now);
	int counter = start.tv_sec - now.tv_sec;
	if (counter <= 1) {
		logicOtpFinished();
		return;
	}

	lv_obj_clean(lv_screen_active());

	lv_obj_t *label0 = lv_label_create(lv_screen_active());
	lv_label_set_text(label0, L("Your code is"));
	lv_obj_set_width(label0, 128);
	lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_align(label0, LV_ALIGN_TOP_LEFT, 0, 4);
	static lv_style_t labelStyle1;
	if (labelStyle1.prop_cnt == 0)
		lv_style_init(&labelStyle1);
	lv_obj_add_style(label0, &labelStyle1, LV_STATE_DEFAULT);

	lv_obj_t *label1 = lv_label_create(lv_screen_active());
	char sz2[16];
	sprintf(sz2, "%03d %03d", (state.otp / 1000) % 1000, state.otp % 1000);
	lv_label_set_text(label1, sz2);
	lv_obj_set_width(label1, 128);
	lv_obj_set_style_text_align(label1, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_align(label1, LV_ALIGN_TOP_LEFT, 0, 22);
	static lv_style_t labelStyle2;
	if (labelStyle2.prop_cnt == 0)
		lv_style_init(&labelStyle2);
	lv_style_set_text_font(&labelStyle2, &lv_font_montserrat_30);
	lv_obj_add_style(label1, &labelStyle2, LV_STATE_DEFAULT);

	lv_obj_t *label2 = lv_label_create(lv_screen_active());
	char sz3[256];
	if (counter > 60)
		sprintf(sz3, L("Cancel the code\nif you didn't request.\nExpires in %dm %2ds"), counter / 60, counter % 60);
	else
		sprintf(sz3, L("Cancel the code\nif you didn't request.\nExpires in %2ds"), counter % 60);
	lv_label_set_text(label2, sz3);
	lv_obj_set_width(label2, 128);
	lv_obj_set_style_text_align(label2, LV_TEXT_ALIGN_CENTER, 0);
	lv_obj_align(label2, LV_ALIGN_TOP_LEFT, 0, 57);
	static lv_style_t labelStyle3;
	if (labelStyle3.prop_cnt == 0)
		lv_style_init(&labelStyle3);
	lv_style_set_text_font(&labelStyle3, &lv_font_montserrat_12);
	lv_obj_add_style(label2, &labelStyle3, LV_STATE_DEFAULT);

	button(LV_KEY_LEFT, L("Cancel"), NULL);
}

void uiScreenSlaveNotConnected() {
	lv_obj_clean(lv_screen_active());
	static int showMsg = 0;
	if (showMsg) {
		lv_obj_t *label0 = lv_label_create(lv_screen_active());
		lv_label_set_text(label0, L("Not connected"));
		lv_obj_set_width(label0, 128);
		lv_obj_set_style_text_align(label0, LV_TEXT_ALIGN_CENTER, 0);
		lv_obj_center(label0);
	}
	showMsg = 1;
}

void uiUpdate() {
	if (state.current == LOGIC_WELCOME || state.current == LOGIC_HOME)
		uiBarTime();
	else if (state.current == LOGIC_OTP)
		uiScreenOtp(-1);
}
