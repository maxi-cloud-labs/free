#ifndef MACRO_H
#define MACRO_H

#define VA_NUM_ARGS(...) VA_NUM_ARGS_IMPL(__VA_ARGS__, 5,4,3,2,1)
#define VA_NUM_ARGS_IMPL(_1,_2,_3,_4,_5,N,...) N
#define macro_dispatcher(func, ...) macro_dispatcher_(func, VA_NUM_ARGS(__VA_ARGS__))
#define macro_dispatcher_(func, nargs) macro_dispatcher__(func, nargs)
#define macro_dispatcher__(func, nargs) func ## nargs
#undef MAX
#define MAX(...) macro_dispatcher(MAX,__VA_ARGS__)(__VA_ARGS__)
#define MAX1(a) a
#define MAX2(a,b) ((a)>(b)?(a):(b))
#define MAX3(a,b,c) MAX2(MAX2(a,b),c)
#define MAX4(a,b,c,d) MAX2(MAX3(a,b,c),d)
#define MAX5(a,b,c,d,e) MAX2(MAX4(a,b,c,d),e)
#define MIN2(a,b) ((a)>(b)?(b):(a))
#define RANGE(a,b,c) MIN2(MAX2(a,b),c)
#define TAB(n) (n == 2 ? "\t\t" : n == 1 ? "\t" : "")

#ifdef DESKTOP
#define ADMIN_PATH "../rootfs/disk/admin/modules/"
#define FRP_PATH "../rootfs/usr/local/modules/frp/"
#define WEB_PATH "../client/src/"
#else
#define ADMIN_PATH "/disk/admin/modules/"
#define FRP_PATH "/usr/local/modules/frp/"
#define WEB_PATH "/usr/local/modules/_core_/web/"
#endif

#define FIRMWARE_PATH "/tmp/firmware.zip"

#define MAIN_DOMAIN "maxi.cloud"
#define SHORT_DOMAIN "maxi.cloud"
#define PLATFORM_PATH "/dev/dongle_platform/%s"
#define SCREEN_PATH "/dev/dongle_screen/%s"
#define SCREEN_FILE "/dev/dongle_screen_f"
#define TEMPERATURE_PATH "/sys/class/thermal/thermal_zone0/%s"
#define BUTTON_PATH "/dev/input/event0"
#define OATH_PATH "/disk/admin/modules/pam/oath.txt"
#define BLE_CHUNK 182
#define COMSOCKET_PORT 8093
#define COMWEBSOCKET_PORT 8094
#define NM_CONFIG_PATH "/etc/NetworkManager/system-connections/%s"

#define ZIGBEE_DEV "/dev/tty_zigbee"
#define ZIGBEE_FIRMWARE "/usr/local/modules/_core_/CC2652R1_coordinator.bin"

#define WIDTH 128	
#define HEIGHT 128
#define DEPTH 3

#define UUID_VERSION 0xfff1
#define UUID_DATA 0xfff2

#ifdef WEB
#define PRINTF(format, ...) {printf(format, ##__VA_ARGS__);}
#else
#define PRINTF_(format, ...) {fprintf(stderr, format, ##__VA_ARGS__);}
#define PRINTF(format, ...) {struct timespec tspr; extern int clock_gettime(int clk_id, struct timespec *tp); clock_gettime(1, &tspr); fprintf(stderr, "[%ld.%03ld] " format, tspr.tv_sec, tspr.tv_nsec / 1000 / 1000, ##__VA_ARGS__);}
#endif

static inline float deltaTime(struct timespec a, struct timespec b) {
	return (a.tv_nsec - b.tv_nsec) / 1000.0 / 1000.0 + ((a.tv_sec - b.tv_sec) * 1000.0);
}

#endif
