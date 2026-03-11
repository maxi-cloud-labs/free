#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <time.h>
#include "language.h"
#include "cJSON.h"
#include "json.h"
#include "state.h"
#include "macro.h"

//Global variable
mylanguage mylanguages[NB_LANG] = {
	{"English", "en"},
	{"French", "fr"},
	{"Spanish", "es"},
	{"Portuguese", "pt"},
	{"German", "de"},
	{"Italian", "it"},
	{"Dutch", "nl"},
	{"Chinese", "zh"},
	{"Japanese", "ja"},
	{"Korean", "kr"},
};

//Private variables
static unsigned char *strings[][NB_LANG] = {
#include "translation.h"
};
static int stringsSize = sizeof(strings) / (sizeof(unsigned char *) * NB_LANG);

//Functions
static int cmpfunc(const void *a, const void *b) {
	return strcmp(*(unsigned char**)a, *(unsigned char**)b);
}

unsigned char *LL(unsigned char *a, int b) {
	unsigned char **item = (unsigned char **)bsearch(&a, strings, stringsSize, sizeof(unsigned char *) * NB_LANG, cmpfunc);
	if (item == NULL) {
		PRINTF("LANGUAGE: This string doesn't exist %s\n", a);
		return a;
	}
	long unsigned int pos = (item - strings[0]) / NB_LANG;
	return strings[pos][b];
}

unsigned char *L(unsigned char *a) {
	if (state.language == 0 || state.language >= NB_LANG)
		return a;
	else
		return LL(a, state.language);
}

void languagePrepare() {
	cJSON *el[NB_LANG];
	cJSON *elApp[NB_LANG];
	PRINTF("Prepare translation\n");
	for (int i = 0; i < NB_LANG; i++) {
		char sz[128];
		snprintf(sz, sizeof(sz), "i18n/app-%s.json", mylanguages[i].code);
		elApp[i] = NULL;
		el[i] = jsonRead(sz);
		if (el[i])
			elApp[i] = cJSON_GetObjectItem(el[i], "app");
	}
	FILE *fp = fopen("translation.h", "w");
	if (fp) {
		cJSON *item;
		PRINTF("%d items to translate in %d languages\n", cJSON_GetArraySize(elApp[0]), NB_LANG);
		for (int j = 0; j < cJSON_GetArraySize(elApp[0]); j++) {
			char sz[2048];
			strcpy(sz, "");
			for (int i = 0; i < NB_LANG; i++) {
				strcat(sz, "\"");
				cJSON *el = NULL;
				if (elApp[i])
					el = cJSON_GetArrayItem(elApp[i], j);
				if (i == 0)
					strcat(sz, el->string);
				else {
					if (el)
						strcat(sz, el->valuestring);
				}
				strcat(sz, "\",");
			}
			strcat(sz, "\n");
			fwrite(sz, strlen(sz), 1, fp);
		}
		fclose(fp);
	}
}

void languageTest() {
	PRINTF("Testing language begin\n");
	PRINTF("Testing language.h for right order\n");
	int i;
	for (i = 0; i < stringsSize - 1; i++)
		if (strcmp(strings[i][0], strings[i + 1][0]) >= 0)
			PRINTF("ERROR at %s\n", strings[i][0]);
	PRINTF("Testing language end\n");
}
