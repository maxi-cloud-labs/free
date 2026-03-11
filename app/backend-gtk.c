#include <stdlib.h>
#include <stdint.h>
#include <gtk/gtk.h>
#include <gdk/gdkx.h>
#include "macro.h"
#include "lvgl.h"
#include "backend.h"
#include "cJSON.h"
#include "state.h"

//Private variables
static lv_color_t buf1[WIDTH * HEIGHT * DEPTH];
static unsigned char fbPublic[WIDTH * HEIGHT * DEPTH];
static GdkPixbuf *pixPrivate;
static GdkPixbuf *pixPrivateScaled;
static GtkWidget *darea;
static lv_coord_t mouse_x;
static lv_coord_t mouse_y;
static lv_indev_state_t mouse_btn = LV_INDEV_STATE_REL;

//Functions
static void delete_event_cb(GtkWidget *widget, GdkEvent *event, void *data) {
	processInput('x');
}

static gboolean mouse_pressed(GtkWidget *widget, GdkEventButton *event, gpointer user_data) {
	mouse_btn = LV_INDEV_STATE_PRESSED;
	return FALSE;
}

static gboolean mouse_released(GtkWidget *widget, GdkEventButton *event, gpointer user_data) {
	mouse_btn = LV_INDEV_STATE_RELEASED;
	return FALSE;
}

static gboolean mouse_motion(GtkWidget *widget, GdkEventMotion *event, gpointer user_data) {
	mouse_x = event->x;
	mouse_y = event->y;
	return FALSE;
}

static gboolean keyboard_press(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
	return TRUE;
}

static gboolean keyboard_release(GtkWidget *widget, GdkEventKey *event, gpointer user_data) {
	uint32_t ascii_key = event->keyval;
	switch(event->keyval) {
	case GDK_KEY_rightarrow:
	case GDK_KEY_Right:
		ascii_key = 67;
		break;
	case GDK_KEY_leftarrow:
	case GDK_KEY_Left:
		ascii_key = 68;
		break;
	case GDK_KEY_uparrow:
	case GDK_KEY_Up:
		ascii_key = 65;
		break;
	case GDK_KEY_downarrow:
	case GDK_KEY_Down:
		ascii_key = 66;
		break;
	case GDK_KEY_Home:
		ascii_key = 72;
		break;
	case GDK_KEY_End:
		ascii_key = 70;
		break;
	default:
		break;
	}
	processInput(ascii_key);
	return TRUE;
}

static void pixmap_destroy_notify(guchar *pixels, gpointer data) {
	PRINTF("ERROR: pixmap_destroy_notify called\n");
}

#define FACTOR 3
static gboolean draw_cb(GtkWidget *widget, cairo_t *cr, gpointer user_data) {
	gdk_pixbuf_scale(pixPrivate, pixPrivateScaled, 0, 0, FACTOR * WIDTH, FACTOR * HEIGHT, 0, 0, FACTOR, FACTOR, GDK_INTERP_BILINEAR);
	gdk_cairo_set_source_pixbuf(cr, pixPrivateScaled, 0, 0);
	cairo_paint (cr);
	return FALSE;
}

static void backendPointer(lv_indev_t *indev, lv_indev_data_t *data) {
	if (state.rotation == 0) {
		data->point.x = mouse_x / FACTOR;
		data->point.y = mouse_y / FACTOR;
	} else if (state.rotation == 1) {
		data->point.x = HEIGHT - 1 - mouse_y / FACTOR;
		data->point.y = mouse_x / FACTOR;
	} else if (state.rotation == 2) {
		data->point.x = WIDTH - 1 - mouse_x / FACTOR;
		data->point.y = HEIGHT - 1 - mouse_y / FACTOR;
	} else if (state.rotation == 3) {
		data->point.x = mouse_y / FACTOR;
		data->point.y = WIDTH - 1 - mouse_x / FACTOR;
	}
	data->state = mouse_btn;
}

void backendInitPointer_plat() {
	lv_indev_t *indevP = lv_indev_create();
	lv_indev_set_type(indevP, LV_INDEV_TYPE_POINTER);
	lv_indev_set_read_cb(indevP, backendPointer);
}

static void backendUpdate_plat(lv_disp_t *disp_drv, const lv_area_t *area, unsigned char *colorp) {
	//PRINTF("Update: xy:%dx%d wh:%dx%d\n", area->x1, area->y1, area->x2 - area->x1 + 1, area->y2 - area->y1 + 1);
	int x = area->x1;
	int y = area->y1;
	int w = area->x2 - area->x1 + 1;
	int h = area->y2 - area->y1 + 1;
	int rot = state.rotation;

	for (int yy = 0; yy < h; yy++)
		for (int xx = 0; xx < w; xx++) {
			int posTx;
			if (rot == 0)
				posTx = ((yy + y) * WIDTH + (xx + x)) * DEPTH;
			else if (rot == 1)
				posTx = ((WIDTH - 1 - xx - x) * HEIGHT + (yy + y)) * DEPTH;
			else if (rot == 2)
				posTx = ((HEIGHT - 1 - yy - y) * WIDTH + (WIDTH - 1 - xx - x)) * DEPTH;
			else if (rot == 3)
				posTx = ((xx + x) * HEIGHT + (HEIGHT - 1 - yy - y)) * DEPTH;
			int posArea = (yy * w + xx) * DEPTH;
			fbPublic[posTx + 0] = colorp[posArea + 2];
			fbPublic[posTx + 1] = colorp[posArea + 1];
			fbPublic[posTx + 2] = colorp[posArea + 0];
		}
	//gdk_pixbuf_save (pixPrivate, "/tmp/a.png", "png", NULL, NULL, NULL, NULL);
	if (darea)
		gtk_widget_queue_draw(darea);

    lv_disp_flush_ready(disp_drv);
}

void backendRotate_plat(int rot) {}

void backendInit_plat(int argc, char *argv[]) {
	gtk_init(&argc, &argv);

	pixPrivate = gdk_pixbuf_new_from_data(fbPublic, GDK_COLORSPACE_RGB, 0, 8, WIDTH, HEIGHT, WIDTH * DEPTH, pixmap_destroy_notify, NULL);
	pixPrivateScaled = gdk_pixbuf_new(GDK_COLORSPACE_RGB, 0, 8, FACTOR * WIDTH, FACTOR * HEIGHT);

	GtkWidget *mainW = gtk_window_new(GTK_WINDOW_TOPLEVEL);
	gtk_window_set_default_size(GTK_WINDOW(mainW), FACTOR * WIDTH, FACTOR * HEIGHT);
	gtk_window_set_resizable (GTK_WINDOW(mainW), FALSE);

	darea = gtk_drawing_area_new();
	gtk_widget_set_size_request(darea, WIDTH, HEIGHT);
	g_signal_connect(darea, "draw", G_CALLBACK(draw_cb), NULL);
	GtkWidget *event_box = gtk_event_box_new();
	gtk_container_add(GTK_CONTAINER (event_box), darea);
	gtk_container_add(GTK_CONTAINER (mainW), event_box);

	gtk_widget_add_events(event_box, GDK_BUTTON_PRESS_MASK);
	gtk_widget_add_events(event_box, GDK_SCROLL_MASK);
	gtk_widget_add_events(event_box, GDK_POINTER_MOTION_MASK);
	gtk_widget_add_events(mainW, GDK_KEY_PRESS_MASK);

	g_signal_connect(event_box, "button-press-event", G_CALLBACK(mouse_pressed), NULL);
	g_signal_connect(event_box, "button-release-event", G_CALLBACK(mouse_released), NULL);
	g_signal_connect(event_box, "motion-notify-event", G_CALLBACK(mouse_motion), NULL);
	g_signal_connect(mainW, "key_press_event", G_CALLBACK(keyboard_press), NULL);
	g_signal_connect(mainW, "key_release_event", G_CALLBACK(keyboard_release), NULL);
	g_signal_connect(mainW, "delete-event", G_CALLBACK(delete_event_cb), NULL);

	gtk_widget_show_all(mainW);
	gtk_window_set_position(GTK_WINDOW(mainW), GTK_WIN_POS_CENTER);

	lv_init();
	lv_display_t *disp = lv_display_create(WIDTH, HEIGHT);
	lv_display_set_buffers(disp, buf1, 0, WIDTH * HEIGHT * DEPTH, LV_DISPLAY_RENDER_MODE_PARTIAL);
	lv_display_set_flush_cb(disp, backendUpdate_plat);

	backendInitPointer_plat();
}

void backendRun_plat() {
	while (doLoop) {
		gtk_main_iteration_do(FALSE);
		backendLoop();
	}
	PRINTF("End of doLoop\n");
}

void backendUninit_plat() {
	lv_deinit();
}
