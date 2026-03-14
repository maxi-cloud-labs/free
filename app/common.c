#define _GNU_SOURCE
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <fcntl.h>
#include <termios.h>
#include <dirent.h>
#include <signal.h>
#include <pthread.h>
#include <netdb.h>
#include <stdarg.h>
#include <ifaddrs.h>
#include <sys/ioctl.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <sys/mman.h>
#include <systemd/sd-bus.h>
#include <arpa/inet.h>
#include <linux/wireless.h>
#include <curl/curl.h>
#include <curl/easy.h>
#include "macro.h"
#include "common.h"

//Global variable
char szSerial[17];

//Private variables
static int termioUsed = 0;
static struct termio termioOriginal;
static pid_t pidLog = 0;
static int doLog = 1;
static int fillSD = 0;
static int fillInternal = 0;

//Functions
void readString(const char *path, const char *key, char *buf, int size) {
	memset(buf, 0, size);
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	int fd = open(fullpath, O_RDONLY);
	if (fd >= 0) {
		read(fd, buf, size);
		close(fd);
	}
}

int readValue(const char *path, const char *key) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	int fd = open(fullpath, O_RDONLY);
	int v = -1;
	char buf[16];
	char *p;
	if (fd >= 0) {
		int ret = read(fd, buf, 16);
		if (ret > 0) {
			buf[ret] = '\0';
			v = strtol(buf, &p, 10);
		}
		close(fd);
	}
	return v;
}

void readValues2(const char *path, const char *key, int *i, int *j) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	int fd = open(fullpath, O_RDONLY);
	char buf[16];
	char *p;
	*i = -2;
	*j = -2;
	if (fd >= 0) {
		int ret = read(fd, buf, 16);
		if (ret > 0) {
			buf[ret] = '\0';
			sscanf(buf, "%d %d", i, j);
		}
		close(fd);
	}
}

void readValues4(const char *path, const char *key, int *i, int *j, int *k, int *l) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	int fd = open(fullpath, O_RDONLY);
	char buf[32];
	char *p;
	*i = -1;
	*j = -1;
	*k = -1;
	*l = -1;
	if (fd >= 0) {
		int ret = read(fd, buf, 32);
		if (ret > 0) {
			buf[ret] = '\0';
			sscanf(buf, "%d %d %d %d", i, j, k, l);
		}
		close(fd);
	}
}

void writeString(const char *path, const char *key, char *buf, int size) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	int fd = open(fullpath, O_WRONLY | O_CREAT, 0644);
	if (fd >= 0) {
		write(fd, buf, size);
		close(fd);
	}
}

void writeValue(const char *path, const char *v) {
	int fd = open(path, O_WRONLY | O_CREAT, 0644);
	if (fd >= 0) {
		write(fd, v, strlen(v));
		close(fd);
	}
}

void writeValueKey(const char *path, const char *key, const char *v) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	writeValue(fullpath, v);
}

void writeValueInt(const char *path, int i) {
	char sz[8];
	sprintf(sz, "%d", i);
	writeValue(path, sz);
}

void writeValueInts(const char *path, int i, int j) {
	char sz[16];
	sprintf(sz, "%d %d", i, j);
	writeValue(path, sz);
}

void writeValueKeyInt(const char *path, const char *key, int i) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	writeValueInt(fullpath, i);
}

void writeValueKeyInts(const char *path, const char *key, int i, int j) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
	writeValueInts(fullpath, i, j);
}

void writeValueKeyPrintf(const char *path, const char *key, const char *fmt, ...) {
	char fullpath[256];
	snprintf(fullpath, sizeof(fullpath), path, key);
    va_list args;
    char *sz = NULL;
    va_start(args, fmt);
    vasprintf(&sz, fmt, args);
    va_end (args);
	writeValue(fullpath, sz);
	if (sz)
		free(sz);
}

int readTemperature() {
#ifdef DESKTOP
	return 65000;
#else
	return readValue(TEMPERATURE_PATH, "temp");
#endif
}

void enterInputMode() {
	termioUsed = 1;
	int fd = fileno(stdin);
	struct termio zap;
	ioctl(fd, TCGETA, &termioOriginal);
	zap = termioOriginal;
	zap.c_cc[VMIN] = 0;
	zap.c_cc[VTIME] = 0;
	zap.c_lflag = 0;
	ioctl(fd, TCSETA, &zap);
}

void leaveInputMode() {
	if (termioUsed) {
		int fd = fileno(stdin);
		ioctl(fd, TCSETA, &termioOriginal);
		termioUsed = 0;
	}
}

void copyFile(char *from, char *to, void (*progresscallback)(int add)) {
	FILE *pf = fopen(from, "rb");
	if (pf) {
		FILE *pt = fopen(to, "wb");
		if (pt) {
			unsigned char buffer[2048];
			size_t ret;
			while ((ret = fread(buffer, 1, 2048, pf)) != 0) {
				fwrite(buffer, 1, ret, pt);
				if (progresscallback)
					progresscallback(ret);
			}
			fflush(pt);
			fclose(pt);
		}
		fclose(pf);
	}
}

static unsigned int rand_() {
	struct timespec spec;
	clock_gettime(CLOCK_REALTIME, &spec);
	unsigned int r = spec.tv_nsec;
	int i;
	for (i = 0; i < 100; i++)
		r = ((r * 7621) + 1) % 32768;
	if (r > 32768)
		r = 1;
	return r;
}

void generateUniqueId(char sz[17]) {
	time_t now = time(0);
	sz[0] = '\0';
	char ss[3];
	int i;
	for (i = 0; i < 8; i++) {
		sprintf(ss, "%02x", rand_() % 256);
		strcat(sz, ss);
	}
	sz[16] = '\0';
}

void generateRandomHexString(char sz[33]) {
	sz[0] = '\0';
	char buffer[16];
	int fd = open("/dev/urandom", O_RDONLY);
	read(fd, buffer, 16);
	close(fd);
	char ss[3];
	int i;
	sz[0] = '\0';
	for (i = 0; i < 16; i++) {
		sprintf(ss, "%02x", buffer[i] & 0xff);
		strcat(sz, ss);
	}
	sz[32] = '\0';
}

void getSerialID() {
#ifdef DESKTOP
	strcpy(szSerial, "1234567890abcdef");
#else
	memset(szSerial, 0, 17);
	readString(PLATFORM_PATH, "serialNumber", szSerial, 16);
#endif
}

int killOtherPids(char *sz) {
	int ret = 0;
	char line_[1024];
	char *line = line_;
	snprintf(line, sizeof(line_), "pidof -o %d %s", getpid(), sz);
	FILE *cmd = popen(line, "r");
	strcpy(line, "");
	fgets(line, 1024, cmd);
	pclose(cmd);
	while (line) {
		pid_t pid = strtoul(line, NULL, 10);
		if (pid > 0) {
			kill(pid, SIGINT);
			ret = 1;
		}
		line = strchr(line, ' ');
		if (line)
			line++;
	}
	return ret;
}

int fileExists(char *st) {
	struct stat statTest;
	return (stat(st, &statTest) == 0);
}

void logInit(int daemon) {
	char sz[256];
#ifdef DESKTOP
	strcpy(sz, "/tmp/app.log");
#else
	strcpy(sz, "/var/log/_core_/app.log");
#endif
	int pipe_fd[2];
	pipe(pipe_fd);
	pidLog = fork();
	if (!pidLog) {
		close(pipe_fd[1]);
		FILE* logFile = fopen(sz, "a");
		char *buf = "===========================\n";
		fwrite(buf, strlen(buf), 1, logFile);
		char ch;
		while (doLog && read(pipe_fd[0], &ch, 1) > 0) {
			if (!daemon)
				putchar(ch);
			if (logFile)
				fputc(ch,logFile);
			if ('\n' == ch) {
				if (!daemon)
					fflush(stdout);
				if(logFile)
					fflush(logFile);
			}
		}
		close(pipe_fd[0]);
		if (logFile)
			fclose(logFile);
		exit(0);
	} else {
		close(pipe_fd[0]);
		dup2(pipe_fd[1], STDOUT_FILENO);
		dup2(pipe_fd[1], STDERR_FILENO);
		close(pipe_fd[1]);
	}
}

void logUninit() {
	doLog = 0;
}

void buzzer(int n) {
#ifndef DESKTOP
	writeValueKeyInt(PLATFORM_PATH, "buzzer", n);
#endif
}

void touchClick() {
#ifndef DESKTOP
	writeValueKeyInt(PLATFORM_PATH, "buzzerClick", 1000);
#endif
}

static void *jingle_t(void *arg) {
#define _100MS 100 * 1000
#define pwm(a, b) writeValueKeyInt(PLATFORM_PATH, "buzzerFreq", a);
#define Task_sleep usleep
	pwm(2000, 1); Task_sleep(2 * _100MS); pwm(0, 0); //200ms 2kHz
	Task_sleep(2 * _100MS);
	pwm(4000, 1); Task_sleep(1 * _100MS); pwm(0, 0); //100ms 4kHz
	Task_sleep(1 * _100MS);
	pwm(4000, 1); Task_sleep(2 * _100MS); pwm(0, 0); //200ms 4kHz
	Task_sleep(2 * _100MS);
	pwm(1650, 1); Task_sleep(1 * _100MS); pwm(0, 0); //100ms 1.65kHz
	Task_sleep(1 * _100MS);
	pwm(1850, 1); Task_sleep(2 * _100MS); pwm(0, 0); //200ms 1.85kHz
	Task_sleep(2 * _100MS);
	pwm(1550, 1); Task_sleep(2 * _100MS); pwm(0, 0); //200ms 1.55kHz
	Task_sleep(2 * _100MS);
	pwm(1650, 1); Task_sleep(2 * _100MS); pwm(0, 0); //200ms 1.65kHz
	Task_sleep(2 * _100MS);
	pwm(2000, 1); Task_sleep(2 * _100MS); pwm(0, 0); //200ms 2kHz
}

void jingle() {
#ifndef DESKTOP
	pthread_t pth;
	pthread_create(&pth, NULL, jingle_t, NULL);
#endif
}

void touch(char *szPath) {
	FILE *pf = fopen(szPath, "w+");
	if (pf)
		fclose(pf);
}

int hardwareVersion() {
	static int rv = -1;
#ifdef DESKTOP
	rv = 30;
#else
	if (rv == -1)
		rv = readValue(PLATFORM_PATH, "hardwareVersion");
#endif
	return rv;
}

static size_t write_callback(char *ptr, size_t size, size_t nmemb, void *userdata) {
	memcpy(userdata, ptr, MIN2(nmemb, 1024));
	char *p = (char *)userdata;
	p[MIN2(nmemb, 1024)] = '\0';
	return nmemb;
}

int downloadURLBuffer(char *url, char *buf, char *header, char *post, char *cookieI, char *cookieO) {
	int ret = -1;
	CURL *curl = curl_easy_init();
	if (curl) {
		curl_easy_setopt(curl, CURLOPT_URL, url);
		struct curl_slist *headers = NULL;
		if (header) {
			headers = curl_slist_append(headers, header);
			curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
		}
		if (post) {
			curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post);
			curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)strlen(post));
		}
		if (cookieI)
			curl_easy_setopt(curl, CURLOPT_COOKIEFILE, cookieI);
		if (cookieO)
			curl_easy_setopt(curl, CURLOPT_COOKIEJAR, cookieO);
		curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
		curl_easy_setopt(curl, CURLOPT_WRITEDATA, buf);
		ret = curl_easy_perform(curl);
		if (headers)
		curl_slist_free_all(headers);
		//PRINTF("Download (ret:%d) %s\n", ret, buf);
		curl_easy_cleanup(curl);
	}
	return ret;
}

int getExternalIP(char *szIPExternal) {
	char buf[1024];
	buf[0] = '\0';
	downloadURLBuffer("https://maxi.cloud/master/ip.json", buf, NULL, NULL, NULL, NULL);
	char *quote3 = NULL;
	char *quote4 = NULL;
	char *quote1 = strchr(buf, '"');
	if (quote1) {
		char *quote2 = strchr(quote1 + 1, '"');
		if (quote2) {
			quote3 = strchr(quote2 + 1, '"');
			if (quote3)
				quote4 = strchr(quote3 + 1, '"');
		}
	}
	if (quote3 && quote4) {
		strcpy(szIPExternal, quote3 + 1);
		szIPExternal[quote4 - quote3 - 1] = '\0';
		int ret = 0;
	}
	int ret = -1;
}

int getLocalIP(char *szIPLocal) {
	int ret = 0;
	int sockInet;
	if ((sockInet = socket(AF_INET, SOCK_DGRAM, 0)) == -1) {
		PRINTF("Error opening socket");
		return -1;
	}

#ifdef DESKTOP
	struct ifaddrs *ifaddr;
	if (getifaddrs(&ifaddr) != -1) {
		struct ifaddrs *ifa;
		int family, s;
		for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next)  {
			if (ifa->ifa_addr == NULL)
				continue;
			int s = getnameinfo(ifa->ifa_addr, sizeof(struct sockaddr_in), szIPLocal, NI_MAXHOST, NULL, 0, NI_NUMERICHOST);
			if ((strcmp(ifa->ifa_name, "lo") != 0) && (ifa->ifa_addr->sa_family == AF_INET) && s == 0)
				break;
		}
		freeifaddrs(ifaddr);
	} else {
		ret = -1;
		PRINTF("ERROR: Can't get IP address\n");
	}
#else
	struct ifreq ifr;
	ifr.ifr_addr.sa_family = AF_INET;
	int getIPTries = 10;
	while(getIPTries > 0) {
		strcpy(ifr.ifr_name, "wlan0");
		if (ioctl(sockInet, SIOCGIFADDR, &ifr) == 0)
			break;
		PRINTF("Can't get IP address (retry #%d)\n", getIPTries);
		getIPTries--;
		usleep(1000 * 1000);
	}
	if (getIPTries == 0) {
		ret = -1;
		PRINTF("ERROR: Can't get IP address\n");
	}
	if (ret != -1)
		sprintf(szIPLocal, "%s", inet_ntoa(((struct sockaddr_in *)&ifr.ifr_addr)->sin_addr));
#endif
	PRINTF("Current IP address is %s\n", szIPLocal);
	close(sockInet);
	return ret;
}

void serviceAction(const char *name, const char *action) {
	PRINTF("Service: %s %s\n", name, action);
	sd_bus *bus = NULL;
	int r = sd_bus_open_system(&bus);
	if (r < 0) {
		PRINTF("Failed to connect to system bus: %s\n", strerror(-r));
		return;
	}
	sd_bus_error error = SD_BUS_ERROR_NULL;
	r = sd_bus_call_method( bus, "org.freedesktop.systemd1", "/org/freedesktop/systemd1", "org.freedesktop.systemd1.Manager", action, &error, NULL, "ss", name, "replace");
	if (r < 0) {
		PRINTF("Failed unit %s: %s\n", name, error.message);
		sd_bus_error_free(&error);
	}
	sd_bus_close(bus);
}

int serviceState(const char *name) {
    sd_bus *bus = NULL;
    sd_bus_error error = SD_BUS_ERROR_NULL;
    char path[256];
    int r = sd_bus_open_system(&bus);
	if (r < 0) {
		PRINTF("Failed to connect to system bus: %s\n", strerror(-r));
		return -1;
	}
    snprintf(path, sizeof(path), "/org/freedesktop/systemd1/unit/%s_2eservice", "jellyfin");
	char *state;
    r = sd_bus_get_property_string(bus, "org.freedesktop.systemd1", path, "org.freedesktop.systemd1.Unit", "ActiveState", &error, &state);
	if (r < 0) {
		PRINTF("Failed unit %s: %s\n", name, error.message);
		sd_bus_error_free(&error);
		return -1;
	}
    sd_bus_close(bus);
    int ret = strcmp(state, "active") == 0;
	free(state);
	return ret;
}
