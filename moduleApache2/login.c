#include <stdlib.h>
#include <stdio.h>
#include "http_request.h"
#include "http_protocol.h"
#include "http_log.h"
#include "mod_auth.h"
#include "apr_strings.h"
#include "apr_shm.h"
#include "apr_proc_mutex.h"
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
#define PRINTFr_(level, format, ...) {ap_log_rerror(APLOG_MARK, level, 0, r, format, ##__VA_ARGS__);}
#define PRINTFr(format, ...) PRINTFr_(APLOG_ERR, format, ##__VA_ARGS__)
#define PRINTFc_(level, format, ...) {ap_log_cerror(APLOG_MARK, level, 0, f->c, format, ##__VA_ARGS__);}
#define PRINTFc(format, ...) PRINTFc_(APLOG_ERR, format, ##__VA_ARGS__)

#define VAL0 "_app_username_"
#define VAL1 "_app_@mydongle.cloud"
#define VAL2 "_app_.1.Password_"
#define VAL3 "_app_%40mydongle.cloud"
#define VAL4 ""
#define CONF_PATH "/disk/admin/modules/_config_/%s.json"
#define INJECTION "<script type='module'>\n\
</script>"

static char *html[][8] = {
};

static char *post[][6] = {
};

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
		char *pos = strstr(data, "<head>");
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
		const char *szScript = apr_psprintf(f->r->pool, INJECTION, html[ctx->foundHtml][6], html[ctx->foundHtml][7], html[ctx->foundHtml][2], html[ctx->foundHtml][3], html[ctx->foundHtml][4], html[ctx->foundHtml][5], confVH->cloudname, html[ctx->foundHtml][0]);
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
	char *posArg1 = strstr(input, search1);
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
		if (strstr(buffer, post[ctx->foundPost][5]) != NULL) {
			char szTmp[128];
			snprintf(szTmp, sizeof(szTmp), CONF_PATH, post[ctx->foundPost][0]);
			el = jsonRead(szTmp);
			if (el) {
				char *arg1 = cJSON_GetStringValue2(el, post[ctx->foundPost][2]);
				char *arg2 = cJSON_GetStringValue2(el, post[ctx->foundPost][3]);
				replace(f, buffer, post[ctx->foundPost][4], post[ctx->foundPost][5], arg1, arg2, &newBuffer);
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

void registerFilter() {
	ap_hook_insert_filter(insert_filter, NULL, NULL, APR_HOOK_LAST);
	ap_register_output_filter("APP_OUTPUT_FILTER", html_filter, NULL, AP_FTYPE_RESOURCE);
	ap_register_input_filter("APP_INPUT_FILTER", post_filter, NULL, AP_FTYPE_RESOURCE);
}
