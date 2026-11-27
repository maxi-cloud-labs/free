#include <stdlib.h>
#include <stdio.h>
#include <time.h>
#include <openssl/hmac.h>
#include <openssl/crypto.h>
#include "http_request.h"
#include "http_protocol.h"
#include "http_log.h"
#include "mod_auth.h"
#include "apr_strings.h"
#include "apr_shm.h"
#include "apr_proc_mutex.h"
#include "apr_general.h"
#include "cJSON.h"
#include "module.h"
#include "json.h"

//Struct
typedef struct {
	int processedPost;
	int foundPost;
	int processedHtml;
	int foundHtml;
	apr_bucket_brigade *saved_bb;
} filter_ctx;

//Defines
//Replace the fixed password placeholder VAL2 by a signed, expiring token
#define OBFUSCATE_PLACEHOLDER

#define PRINTFr_(level, format, ...) {ap_log_rerror(APLOG_MARK, level, 0, r, format, ##__VA_ARGS__);}
#define PRINTFr(format, ...) PRINTFr_(APLOG_ERR, format, ##__VA_ARGS__)
#define PRINTFc_(level, format, ...) {ap_log_cerror(APLOG_MARK, level, 0, f->c, format, ##__VA_ARGS__);}
#define PRINTFc(format, ...) PRINTFc_(APLOG_ERR, format, ##__VA_ARGS__)

#define VAL0 "_app_username_"
#define VAL1 "_app_@maxi.cloud"
#define VAL2 "_app_.1.Password_" //With OBFUSCATE_PLACEHOLDER, only a marker replaced by tokenMake()
#define VAL3 "_app_%40maxi.cloud"
#define VAL4 ""
//Password token: TOKEN_PREFIX + expiry (8 hex) + truncated HMAC (16 hex), 29 characters
#define TOKEN_PREFIX "_app_"
#define TOKEN_LEN (sizeof(TOKEN_PREFIX) - 1 + 8 + 16)
#define TOKEN_TTL 3600
#define CONF_PATH "/disk/admin/modules/_config_/%s.json"
#define INJECTION "<script type='module'>\n\
</script>"

static char *html[][8] = {
};

static char *post[][6] = {
};

#ifdef OBFUSCATE_PLACEHOLDER
//Private variable
static unsigned char tokenSecret[32];

// HMAC over module and expiry: a token only works for this module until expiry
// Not bound to the jwt cookie because the admin site renews it on each load
static void tokenMac(request_rec *r, const char *module, unsigned long exp, char *hex) {
	const char *msg = apr_psprintf(r->pool, "%s\n%08lx", module, exp);
	unsigned char mac[EVP_MAX_MD_SIZE];
	unsigned int macLen = 0;
	HMAC(EVP_sha256(), tokenSecret, sizeof(tokenSecret), (const unsigned char *)msg, strlen(msg), mac, &macLen);
	for (int i = 0; i < 8; i++)
		snprintf(hex + i * 2, 3, "%02x", mac[i]);
}

static const char *tokenMake(request_rec *r, const char *module) {
	unsigned long exp = (unsigned long)time(NULL) + TOKEN_TTL;
	char hex[17];
	tokenMac(r, module, exp, hex);
	return apr_psprintf(r->pool, "%s%08lx%s", TOKEN_PREFIX, exp, hex);
}

// Returns a copy of the first valid token found in buffer, or NULL
static char *tokenFind(request_rec *r, const char *module, const char *buffer) {
	const size_t prefixLen = sizeof(TOKEN_PREFIX) - 1;
	for (const char *pos = strstr(buffer, TOKEN_PREFIX); pos; pos = strstr(pos + 1, TOKEN_PREFIX)) {
		if (strspn(pos + prefixLen, "0123456789abcdef") < 24)
			continue;
		char expSt[9];
		memcpy(expSt, pos + prefixLen, 8);
		expSt[8] = '\0';
		unsigned long exp = strtoul(expSt, NULL, 16);
		if (exp < (unsigned long)time(NULL))
			continue;
		char hex[17];
		tokenMac(r, module, exp, hex);
		if (CRYPTO_memcmp(hex, pos + prefixLen + 8, 16) == 0)
			return apr_pstrndup(r->pool, pos, TOKEN_LEN);
	}
	return NULL;
}
#endif

//Functions
static apr_status_t html_filter(ap_filter_t *f, apr_bucket_brigade *bb) {
	filter_ctx *ctx = (filter_ctx *)f->ctx;
	if (!ctx)
		return ap_pass_brigade(f->next, bb);
	//PRINTFc("APP: Html %lu %d", (long unsigned int)ctx, ctx->processedHtml);
	if (ctx->processedHtml || authorization2(f->r, "admin", 1) != AUTHZ_GRANTED)
		return ap_pass_brigade(f->next, bb);
	if (ctx->saved_bb == NULL)
		ctx->saved_bb = apr_brigade_create(f->r->pool, f->c->bucket_alloc);
	APR_BRIGADE_CONCAT(ctx->saved_bb, bb);
	apr_bucket *b;
	for (b = APR_BRIGADE_FIRST(ctx->saved_bb); b != APR_BRIGADE_SENTINEL(ctx->saved_bb); b = APR_BUCKET_NEXT(b)) {
		if (APR_BUCKET_IS_EOS(b))
			break;
		if (ctx->processedHtml || APR_BUCKET_IS_FLUSH(b) || APR_BUCKET_IS_METADATA(b)) {
			if (APR_BUCKET_IS_FLUSH(b))
				APR_BUCKET_REMOVE(b);
			continue;
		}
		const char *data;
		apr_size_t len;
		apr_status_t rv = apr_bucket_read(b, &data, &len, APR_BLOCK_READ);
		if (rv != APR_SUCCESS) {
			PRINTFc("APP: Error apr_bucket_read %d", rv);
			return rv;
		}
#define MIN2(a,b) ((a)>(b)?(b):(a))
		//PRINTFc("%.*s", MIN2(128, len), data);
		const char *pos = strstr(data, "<head>");
		if (pos == NULL) {
			pos = strstr(data, "<html>");
			if (pos == NULL) {
					pos = strstr(data, "<html");
					if (pos == NULL)
						continue;
					pos = strstr(pos, ">");
					if (pos == NULL)
						continue;
					pos -= 5;
			}
		}
		apr_size_t offset = (pos - data) + 6;
		configVH *confVH = (configVH *)ap_get_module_config(f->r->server->module_config, &app_module);
		const char *val1 = html[ctx->foundHtml][6];
		const char *val2 = html[ctx->foundHtml][7];
#ifdef OBFUSCATE_PLACEHOLDER
		if (strcmp(val1, VAL2) == 0)
			val1 = tokenMake(f->r, html[ctx->foundHtml][0]);
		if (strcmp(val2, VAL2) == 0)
			val2 = tokenMake(f->r, html[ctx->foundHtml][0]);
#endif
		const char *szScript = apr_psprintf(f->r->pool, INJECTION, val1, val2, html[ctx->foundHtml][2], html[ctx->foundHtml][3], html[ctx->foundHtml][4], html[ctx->foundHtml][5], confVH->cloudname, html[ctx->foundHtml][0]);
		apr_bucket *inject_b = apr_bucket_transient_create(szScript, strlen(szScript), f->c->bucket_alloc);
		apr_bucket_split(b, offset);
		APR_BUCKET_INSERT_AFTER(b, inject_b);
		const char *cl_str = apr_table_get(f->r->headers_out, "Content-Length");
		if (cl_str) {
			apr_off_t current_len = (apr_off_t)apr_atoi64(cl_str);
			apr_size_t insert_size = strlen(szScript);
			ap_set_content_length(f->r, current_len + (apr_off_t)insert_size);
		}
		ctx->processedHtml = 1;
	}
	apr_status_t rv = ap_pass_brigade(f->next, ctx->saved_bb);
	apr_brigade_cleanup(ctx->saved_bb);
	ctx->saved_bb = NULL;
	return rv;
}

static void replace(ap_filter_t *f, char *input, char *search1, char *search2, char *arg1, char *arg2, char **output) {
	const char *posArg1 = strstr(input, search1);
	char *tmp;
	if (posArg1 && arg1) {
		tmp = malloc(strlen(input) + strlen(arg1) - strlen(search1) + 1);
		strncpy(tmp, input, posArg1 - input);
		tmp[posArg1 - input] = '\0';
		strcat(tmp, arg1);
		strcat(tmp, posArg1 + strlen(search1));
	} else {
		if (strchr(search1, '@') != NULL) {
			replace(f, input, VAL3, search2, arg1, arg2, output);
			return;
		}
		tmp = malloc(strlen(input) + 1);
		strcpy(tmp, input);
	}
	char *posArg2 = strstr(tmp, search2);
	if (posArg2 && arg2) {
		*posArg2 = '\0';
		*output = apr_pstrcat(f->r->pool, tmp, arg2, posArg2 + strlen(search2), NULL);
	} else
		*output = apr_pstrcat(f->r->pool, tmp, NULL);
	free(tmp);
}

static apr_status_t post_filter(ap_filter_t *f, apr_bucket_brigade *bb, ap_input_mode_t mode, apr_read_type_e block, apr_off_t readbytes) {
	filter_ctx *ctx = (filter_ctx *)f->ctx;
	if (!ctx)
		return ap_get_brigade(f->next, bb, mode, block, readbytes);
	//PRINTFc("APP: Post %lu %d", (long unsigned int)ctx, ctx->processedPost);
	apr_status_t rv = 0;
	int firstPassDone = 0;
	apr_bucket_brigade *tmp_bb = NULL;
	cJSON *el = NULL;
	if (ctx->processedPost)
		goto end;
	if (authorization2(f->r, "admin", 1) != AUTHZ_GRANTED)
		goto end;
	if (mode != AP_MODE_READBYTES || f->r->method_number != M_POST)
		goto end;
	tmp_bb = apr_brigade_create(f->r->pool, f->c->bucket_alloc);
	rv = ap_get_brigade(f->next, tmp_bb, mode, block, readbytes);
	if (rv != APR_SUCCESS)
		goto end;
	apr_bucket *b;
	while ((b = APR_BRIGADE_FIRST(tmp_bb)) != APR_BRIGADE_SENTINEL(tmp_bb)) {
		APR_BUCKET_REMOVE(b);
		if (APR_BUCKET_IS_EOS(b)) {
			APR_BRIGADE_INSERT_TAIL(bb, b);
			break;
		}
		const char *data;
		apr_size_t len;
		rv = apr_bucket_read(b, &data, &len, APR_BLOCK_READ);
		if (rv != APR_SUCCESS)
			goto end;
		char *buffer = apr_pmemdup(f->r->pool, data, len + 1);
		buffer[len] = '\0';
		//PRINTFc("APP: Post Before %lu##%s##", len, buffer);
		char *newBuffer = NULL;
		int ret = 0;
		char *search1 = post[ctx->foundPost][4];
		char *search2 = post[ctx->foundPost][5];
#ifdef OBFUSCATE_PLACEHOLDER
		// The password placeholder must be a valid token; other placeholders are plain strings
		int found = 1;
		if (strcmp(search1, VAL2) == 0)
			found = (search1 = tokenFind(f->r, post[ctx->foundPost][0], buffer)) != NULL;
		if (strcmp(search2, VAL2) == 0)
			found = (search2 = tokenFind(f->r, post[ctx->foundPost][0], buffer)) != NULL;
		else if (strstr(buffer, search2) == NULL)
			found = 0;
#else
		int found = strstr(buffer, search2) != NULL;
#endif
		if (found) {
			char szTmp[128];
			snprintf(szTmp, sizeof(szTmp), CONF_PATH, post[ctx->foundPost][0]);
			el = jsonRead(szTmp);
			if (el) {
				char *arg1 = cJSON_GetStringValue_(el, post[ctx->foundPost][2]);
				char *arg2 = cJSON_GetStringValue_(el, post[ctx->foundPost][3]);
				replace(f, buffer, search1, search2, arg1, arg2, &newBuffer);
				ret = 1;
				len = strlen(newBuffer);
				//PRINTFc("APP: Post After %lu##%s##", len, newBuffer);
				char *len_str = apr_palloc(f->r->pool, 32);
				snprintf(len_str, 32, "%lu", len);
				apr_table_setn(f->r->subprocess_env, "CONTENT_LENGTH", len_str);
			}
		}
		if (ret == 0)
			newBuffer = buffer;
		apr_bucket *reinsert_b = apr_bucket_transient_create(newBuffer, len, f->c->bucket_alloc);
		APR_BRIGADE_INSERT_TAIL(bb, reinsert_b);
		apr_bucket_destroy(b);
	}
	firstPassDone = 1;
end:
	if (tmp_bb)
		apr_brigade_destroy(tmp_bb);
	if (el)
		cJSON_Delete(el);
	ctx->processedPost = 1;
	return firstPassDone ? 0 : rv != 0 ? rv : ap_get_brigade(f->next, bb, mode, block, readbytes);
}

int STRCMP(const char *a, const char *b) {
	if (b[strlen(b) - 1] == '*')
		return strncmp(a, b, strlen(b) - 1);
	else
		return strcmp(a, b);
}

static void insert_filter(request_rec *r) {
	server_rec *s = r->server;
	configVH *confVH = (configVH *)ap_get_module_config(s->module_config, &app_module);
	if (confVH->autologin == 0)
		return;
	//PRINTFr("APP: Filtering? %s %s %s", r->hostname, r->uri, confVH->name);
	filter_ctx *ctx = NULL;
	int ret, ii;
	ret = 0;
	ii = sizeof(html) / sizeof(html[0]);
	for (int i = 0; i < ii; i++) {
		int c = strcmp(confVH->name, html[i][0]);
		if (c < 0)
			break;
		if (c == 0 && strcmp(r->uri, html[i][1]) == 0) {
			if (!ctx)
				ctx = apr_pcalloc(r->pool, sizeof(filter_ctx));
			ctx->foundHtml = i;
			ctx->processedHtml = 0;
			//PRINTFr("APP: Output, inserting html for %s %s %s", r->hostname, r->uri, confVH->name);
			ap_add_output_filter("APP_OUTPUT_FILTER", ctx, r, r->connection);
			break;
		}
	}
	ret = 0;
	ii = sizeof(post) / sizeof(post[0]);
	for (int i = 0; i < ii; i++) {
		int c = strcmp(confVH->name, post[i][0]);
		if (c < 0)
			break;
		if (c == 0 && STRCMP(r->uri, post[i][1]) == 0) {
			if (!ctx)
				ctx = apr_pcalloc(r->pool, sizeof(filter_ctx));
			ctx->foundPost = i;
			ctx->processedPost = 0;
			//PRINTFr("APP: Input, modifying post for %s %s %s", r->hostname, r->uri, confVH->name);
			ap_add_input_filter("APP_INPUT_FILTER", ctx, r, r->connection);
			break;
		}
	}
}

#ifdef OBFUSCATE_PLACEHOLDER
// Runs in the parent before the children fork, so all children share the secret
static int tokenInit(apr_pool_t *pconf, apr_pool_t *plog, apr_pool_t *ptemp, server_rec *s) {
	if (apr_generate_random_bytes(tokenSecret, sizeof(tokenSecret)) != APR_SUCCESS) {
		ap_log_error(APLOG_MARK, APLOG_CRIT, 0, s, "APP: Cannot generate autologin secret");
		return HTTP_INTERNAL_SERVER_ERROR;
	}
	return OK;
}
#endif

void registerFilter() {
#ifdef OBFUSCATE_PLACEHOLDER
	ap_hook_post_config(tokenInit, NULL, NULL, APR_HOOK_MIDDLE);
#endif
	ap_hook_insert_filter(insert_filter, NULL, NULL, APR_HOOK_LAST);
	ap_register_output_filter("APP_OUTPUT_FILTER", html_filter, NULL, AP_FTYPE_RESOURCE);
	ap_register_input_filter("APP_INPUT_FILTER", post_filter, NULL, AP_FTYPE_RESOURCE);
}
