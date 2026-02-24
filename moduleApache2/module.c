#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <sys/stat.h>
#include <jwt.h>
#include "http_request.h"
#include "http_log.h"
#include "apr_strings.h"
#include "apr_shm.h"
#include "apr_proc_mutex.h"
#include "mod_auth.h"
#include "macro.h"
#include "cJSON.h"
#include "json.h"
#include "login.h"
#include "module.h"

//Defines
#define STATS

#undef PRINTF_
#undef PRINTF
#define PRINTF_(level, format, ...) {ap_log_error(APLOG_MARK, level, 0, s, format, ##__VA_ARGS__);}
#define PRINTF(format, ...) PRINTF_(APLOG_ERR, format, ##__VA_ARGS__)

//Functions
static apr_status_t cleanup(void *data) {
	configVH *confVH = (configVH *)data;
	int *global_hits = apr_shm_baseaddr_get(confVH->shm_hits);
	time_t *global_lasttime = apr_shm_baseaddr_get(confVH->shm_lasttime);
	if (global_hits && global_lasttime && *global_hits) {
		char sz[256];
		snprintf(sz, sizeof(sz), "/var/log/apache2/stats-%s.json", confVH->name);
		cJSON *el = jsonRead(sz);
		if (!el)
			el = cJSON_CreateObject();
		int hits = (int)cJSON_GetNumberValue2(el, "hits");
		cJSON_AddNumberToObject(el, "hits", hits + *global_hits);
		cJSON_AddNumberToObject(el, "lasttime", *global_lasttime);
		jsonWrite(el, sz);
		chmod(sz, 0666);
	}
	return APR_SUCCESS;
}

static void *createConfig(apr_pool_t *p, server_rec *s) {
	if (s->is_virtual) {
		configVH *confVH = apr_pcalloc(p, sizeof(configVH));
		memset(confVH, 0, sizeof(configVH));
		apr_shm_create(&confVH->shm_hits, sizeof(int), NULL, p);
		int *global_hits = apr_shm_baseaddr_get(confVH->shm_hits);
		*global_hits = 0;
		apr_shm_create(&confVH->shm_lasttime, sizeof(time_t), NULL, p);
		time_t *global_lasttime = apr_shm_baseaddr_get(confVH->shm_lasttime);
		*global_lasttime = 0;
#ifdef STATS
		apr_proc_mutex_create(&confVH->mutex, "stats", APR_LOCK_DEFAULT, p);
#endif
		apr_pool_cleanup_register(p, confVH, cleanup, apr_pool_cleanup_null);
		return confVH;
	} else {
		configS *confS = apr_pcalloc(p, sizeof(configS));
		memset(confS, 0, sizeof(configS));
		return confS;
	}
}

static void *mergeConfig(apr_pool_t *p, void *basev, void *addv) {
	configS *confS = (configS *)basev;
	configVH *confVH = (configVH *)addv;
	confVH->jwkPem = confS->jwkPem;
	confVH->autologin = confS->autologin;
	return confVH;
}

char *getJwkPemContent(const char *arg) {
	char *sz = NULL;
	struct stat statTest;
	if (stat(arg, &statTest) == 0) {
		if (statTest.st_size > 100) {
			int size = statTest.st_size + 1;
			sz = malloc(size);
			FILE *pf = fopen(arg, "r");
			if (pf) {
				int ret = fread(sz, 1, size, pf);
				if (ret >= 0)
					sz[ret] = '\0';
				fclose(pf);
			}
		}
	}
	return sz;
}

static const char *moduleJwkPemFileSet(cmd_parms *cmd, void *mconfig, const char *arg) {
	server_rec *s = cmd->server;
	configS *confS = (configS *)ap_get_module_config(s->module_config, &app_module);
	confS->jwkPem = getJwkPemContent(arg);
	PRINTF("APP: Jwt %s", arg);
	return NULL;
}

static const char *moduleNameSet(cmd_parms *cmd, void *mconfig, const char *arg) {
	server_rec *s = cmd->server;
	configVH *confVH = (configVH *)ap_get_module_config(s->module_config, &app_module);
	confVH->name = arg;
	PRINTF("APP: Name %s", arg);
	return NULL;
}

static const char *moduleAutoLoginSet(cmd_parms *cmd, void *mconfig, const char *arg) {
	server_rec *s = cmd->server;
	configS *confS = (configS *)ap_get_module_config(s->module_config, &app_module);
	confS->autologin = strcmp(arg, "on") == 0 ? 1 : 0;
	PRINTF("AppAutoLogin: %s", arg);
	return NULL;
}

static char *extractCookieValue(const char *cookie, const char *name, struct request_rec *r) {
	if (cookie == NULL || name == NULL)
		return NULL;
	const char *name_start = strstr(cookie, name);
	if (name_start == NULL)
		return NULL;
	if (*(name_start + strlen(name)) != '=')
		return extractCookieValue(name_start + 1, name, r);

	const char *value_start = name_start + strlen(name) + 1;
	const char *value_end = strchr(value_start, ';');

	size_t value_len = value_end == NULL ? strlen(value_start) : (value_end - value_start);
	char *extracted_value = apr_pstrndup(r->pool, value_start, value_len);
	return extracted_value;
}

static int decodeAndCheck(server_rec *s, const char *token, const char *keyPem, const char *permission, int strict) {
	int ret = 0;
	jwt_t* jwt_decoded;
	int result = jwt_decode(&jwt_decoded, token, (const unsigned char*)keyPem, strlen(keyPem));
	if (result == 0) {
		time_t current_time = time(NULL);
		time_t exp_time = (time_t)jwt_get_grant_int(jwt_decoded, "exp");
		if (current_time < exp_time) {
			const char *jwtRole = jwt_get_grant(jwt_decoded, "role");
			if (strict)
				ret = strcmp(jwtRole, "admin") == 0;
			else {
				//const char *jwtUsername = jwt_get_grant(jwt_decoded, "username");
				//PRINTF("APP: JWT ret:%d role:%s username:%s\n", ret, jwtRole, jwtUsername);
				if (strcmp(jwtRole, "admin") == 0 || strcmp(permission, "user") == 0)
					ret = 1;
			}
		}
		jwt_free(jwt_decoded);
	} else {
		//PRINTF("APP: JWT verification failed: %d\n", result);
	}
	return ret;
}

int authorization2(request_rec *r, const char *permission, int strict) {
	server_rec *s = r->server;
	if (!strict && strcmp(permission, "public") == 0)
		return AUTHZ_GRANTED;
	const char *cookies = apr_table_get(r->headers_in, "Cookie");
	char *cookieJwt = extractCookieValue(cookies, "jwt", r);
	//PRINTF("APP: authorization2 cookieJwt: %s", cookieJwt);
	if (cookieJwt != NULL && strlen(cookieJwt) > 0) {
		configVH *confVH = (configVH *)ap_get_module_config(s->module_config, &app_module);
		//PRINTF("APP: authorization2 %s jwkPem: %.*s", permission, 32, confVH->jwkPem);
		return decodeAndCheck(s, cookieJwt, confVH->jwkPem, permission, strict) == 1 ? AUTHZ_GRANTED : AUTHZ_DENIED;
	}
	return AUTHZ_DENIED;
}

static authz_status app_permission_check(request_rec *r, const char *require_line, const void *parsed_require_line) {
	const char *permission = ap_getword_conf(r->pool, &require_line);
	server_rec *s = r->server;
	const char *current_uri = r->uri;
	if (current_uri != NULL && strncmp(current_uri, "/_app_/", 7) == 0)
		return AUTHZ_GRANTED;
	configVH *confVH = (configVH *)ap_get_module_config(s->module_config, &app_module);
	//PRINTF("APP: name:%s uri:%s", confVH->name, r->uri);
	//const apr_array_header_t *fields = apr_table_elts(r->headers_in);
	//const apr_table_entry_t *e = (const apr_table_entry_t *)fields->elts;
	//for (int i = 0; i < fields->nelts; i++) {
	//	PRINTF("APP: Header(%d) %s = %s", i, e[i].key, e[i].val);
	//}
	if (confVH->name && strcmp(confVH->name, "prettierplayground") == 0) {
		const char *sec_dest = apr_table_get(r->headers_in, "Sec-Fetch-Dest");
		const char *sec_mode = apr_table_get(r->headers_in, "Sec-Fetch-Mode");
		const char *sec_site = apr_table_get(r->headers_in, "Sec-Fetch-Site");
		if (sec_dest && sec_site && sec_mode && (strcmp(sec_dest, "serviceworker") == 0 || strcmp(sec_dest, "worker") == 0) && (strcmp(sec_mode, "same-origin") == 0 || strcmp(sec_mode, "cors") == 0) && strcmp(sec_site, "same-origin") == 0)
			return AUTHZ_GRANTED;
	}
	if (confVH->name && strcmp(confVH->name, "livecodes") == 0) {
		if (strncmp(current_uri, "/livecodes/", 11) == 0)
			return AUTHZ_GRANTED;
	}
	return authorization2(r, permission, 0);
}

static int statsCounter(request_rec *r) {
#ifdef STATS
	server_rec *s = r->server;
	configVH *confVH = (configVH *)ap_get_module_config(s->module_config, &app_module);
	int *global_hits = apr_shm_baseaddr_get(confVH->shm_hits);
	time_t *global_lasttime = apr_shm_baseaddr_get(confVH->shm_lasttime);
	apr_proc_mutex_lock(confVH->mutex);
	(*global_hits)++;
	*global_lasttime = time(NULL);
	apr_proc_mutex_unlock(confVH->mutex);
	//PRINTF("APP: stats name:%s uri:%s hits:%d", confVH->name, r->uri, *global_hits);
#endif
	return DECLINED;
}

static const command_rec directives[] = {
	AP_INIT_TAKE1("AppJwkPem", moduleJwkPemFileSet, NULL, RSRC_CONF | ACCESS_CONF, "App Jwt Key"),
	AP_INIT_TAKE1("AppModule", moduleNameSet, NULL, RSRC_CONF | ACCESS_CONF, "App module name"),
	AP_INIT_TAKE1("AppALEnabled", moduleAutoLoginSet, NULL, RSRC_CONF | ACCESS_CONF, "AutoLogin Enabled"),
	{NULL}
};

static const authz_provider authz_app_module_provider = { &app_permission_check, NULL };

static void registerHooks(apr_pool_t *p) {
	ap_register_auth_provider(p, AUTHZ_PROVIDER_GROUP, "AppModulePermission", AUTHZ_PROVIDER_VERSION, &authz_app_module_provider, AP_AUTH_INTERNAL_PER_CONF);
	ap_hook_access_checker(statsCounter, NULL, NULL, APR_HOOK_FIRST);
	registerFilter();
}

module AP_MODULE_DECLARE_DATA app_module = {
	STANDARD20_MODULE_STUFF, NULL, NULL, createConfig, mergeConfig, directives, registerHooks
};
