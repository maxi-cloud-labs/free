#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/socket.h>
#include <sys/un.h>
#include "macro.h"
#include "communication.h"

//Define
#define COMAUTH_PATH ADMIN_PATH "betterauth/app.sock"
#define COMAUTH_MAX (1024 * 1024)

//Private variables
static pthread_mutex_t writeMutex = PTHREAD_MUTEX_INITIALIZER;
static int fdAuth = -1;

//Functions
static int writeAll(int fd, const char *data, int size) {
	while (size > 0) {
		int ret = send(fd, data, size, MSG_NOSIGNAL);
		if (ret <= 0)
			return -1;
		data += ret;
		size -= ret;
	}
	return 0;
}

//One JSON message per line: newlines of cJSON_Print are only formatting, JSON strings can't contain raw newlines
static int writeLine(const char *before, const char *data, int size, const char *after) {
	int lb = strlen(before), la = strlen(after);
	char *line = malloc(lb + size + la + 1);
	if (line == NULL)
		return 0;
	memcpy(line, before, lb);
	memcpy(line + lb, data, size);
	memcpy(line + lb + size, after, la);
	for (int i = 0; i < lb + size + la; i++)
		if (line[i] == '\n' || line[i] == '\r')
			line[i] = ' ';
	line[lb + size + la] = '\n';
	int ret = 0;
	pthread_mutex_lock(&writeMutex);
	if (fdAuth >= 0 && writeAll(fdAuth, line, lb + size + la + 1) == 0)
		ret = size;
	pthread_mutex_unlock(&writeMutex);
	free(line);
	return ret;
}

//Message for better-auth itself
int serverWriteDataAuth(unsigned char *data, int size) {
	return writeLine("", (char *)data, size, "");
}

//Message for the browsers connected to better-auth
int serverForwardDataAuth(char *sz) {
	return writeLine("{\"a\":\"forward\",\"p\":", sz, strlen(sz), "}");
}

static void readLines(int fd) {
	int size = 4096, pos = 0;
	char *buf = malloc(size);
	while (buf) {
		if (pos == size - 1) {
			char *buf2 = size < COMAUTH_MAX ? realloc(buf, size * 2) : NULL;
			if (buf2 == NULL) {
				PRINTF("comAuth: Line too long\n");
				break;
			}
			buf = buf2;
			size *= 2;
		}
		int ret = read(fd, buf + pos, size - 1 - pos);
		if (ret <= 0)
			break;
		pos += ret;
		char *start = buf, *nl;
		while ((nl = memchr(start, '\n', buf + pos - start)) != NULL) {
			*nl = '\0';
			if (nl > start)
				communicationReceive((unsigned char *)start, nl - start, "auth");
			start = nl + 1;
		}
		pos -= start - buf;
		memmove(buf, start, pos);
	}
	free(buf);
}

static void *communicationAuth_t(void *arg) {
	struct sockaddr_un addr;
	memset(&addr, 0, sizeof(addr));
	addr.sun_family = AF_UNIX;
	strncpy(addr.sun_path, COMAUTH_PATH, sizeof(addr.sun_path) - 1);
	while (1) {
		int fd = socket(AF_UNIX, SOCK_STREAM, 0);
		if (fd < 0 || connect(fd, (struct sockaddr *)&addr, sizeof(addr)) != 0) {
			if (fd >= 0)
				close(fd);
			sleep(2);
			continue;
		}
		PRINTF("comAuth: Connected\n");
		pthread_mutex_lock(&writeMutex);
		fdAuth = fd;
		pthread_mutex_unlock(&writeMutex);
		readLines(fd);
		pthread_mutex_lock(&writeMutex);
		fdAuth = -1;
		pthread_mutex_unlock(&writeMutex);
		close(fd);
		communicationConnection(0, 0);
		PRINTF("comAuth: Disconnected\n");
		sleep(2);
	}
	return NULL;
}

void communicationAuth() {
	pthread_t pth;
	pthread_create(&pth, NULL, communicationAuth_t, NULL);
}
