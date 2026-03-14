#include "ap_listen.h"
#include "httpd.h"
#include "http_config.h"
#include "http_connection.h"
#include "http_protocol.h"
#include "http_log.h"
#include "http_main.h"
#include "apr_strings.h"

//Structs
typedef struct remoteip_addr_info {
	struct remoteip_addr_info *next;
	apr_sockaddr_t *addr;
	server_rec *source;
} remoteip_addr_info;

typedef struct {
	int enabled;
	apr_pool_t *pool;
} remoteip_config_t;


typedef struct {
	char line[108];
} proxy_v1;

typedef union {
	struct {		/* for TCP/UDP over IPv4, len = 12 */
		apr_uint32_t src_addr;
		apr_uint32_t dst_addr;
		apr_uint16_t src_port;
		apr_uint16_t dst_port;
	} ip4;
	struct {		/* for TCP/UDP over IPv6, len = 36 */
		 apr_byte_t src_addr[16];
		 apr_byte_t dst_addr[16];
		 apr_uint16_t src_port;
		 apr_uint16_t dst_port;
	} ip6;
	struct {		/* for AF_UNIX sockets, len = 216 */
		 apr_byte_t src_addr[108];
		 apr_byte_t dst_addr[108];
	} unx;
} proxy_v2_addr;

typedef struct {
	apr_byte_t sig[12]; /* hex 0D 0A 0D 0A 00 0D 0A 51 55 49 54 0A */
	apr_byte_t ver_cmd; /* protocol version and command */
	apr_byte_t fam;	 /* protocol family and address */
	apr_uint16_t len;	 /* number of following bytes part of the header */
	proxy_v2_addr addr;
} proxy_v2;

typedef union {
		proxy_v1 v1;
		proxy_v2 v2;
} proxy_header;

static const char v2sig[12] = "\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A";
#define MIN_V1_HDR_LEN 15
#define MIN_V2_HDR_LEN 16
#define MIN_HDR_LEN MIN_V1_HDR_LEN

/* XXX: Unsure if this is needed if v6 support is not available on
 this platform */
#ifndef INET6_ADDRSTRLEN
#define INET6_ADDRSTRLEN 46
#endif

typedef struct {
	char header[sizeof(proxy_header)];
	apr_size_t rcvd;
	apr_size_t need;
	int version;
	ap_input_mode_t mode;
	apr_bucket_brigade *bb;
	int done;
} remoteip_filter_context;

typedef struct {
	/** The parsed client address in native format */
	apr_sockaddr_t *client_addr;
	/** Character representation of the client */
	char *client_ip;
} remoteip_conn_config_t;

typedef enum { HDR_DONE, HDR_ERROR, HDR_NEED_MORE } remoteip_parse_status_t;

//Defines
#undef PRINTF_
#undef PRINTF
#define PRINTF_(level, format, ...) { ap_log_error(APLOG_MARK, level, 0, s, format, ##__VA_ARGS__); }
#define PRINTF(format, ...) PRINTF_(APLOG_ERR, format, ##__VA_ARGS__)
#define PRINTFc_(level, format, ...) { ap_log_cerror(APLOG_MARK, level, 0, c, format, ##__VA_ARGS__); }
#define PRINTFc(format, ...) PRINTFc_(APLOG_ERR, format, ##__VA_ARGS__)
#define PRINTFr_(level, format, ...) { ap_log_rerror(APLOG_MARK, level, 0, r, format, ##__VA_ARGS__); }
#define PRINTFr(format, ...) PRINTFr_(APLOG_ERR, format, ##__VA_ARGS__)

//Private variables
static ap_filter_rec_t *remoteip_filter;

//Functions
module AP_MODULE_DECLARE_DATA app_ip_module;

static int remoteip_is_server_port(apr_port_t port) {
	ap_listen_rec *lr;
	for (lr = ap_listeners; lr; lr = lr->next) {
		if (lr->bind_addr && lr->bind_addr->port == port) {
			return 1;
		}
	}
	return 0;
}

/*
 * Human readable format:
 * PROXY {TCP4|TCP6|UNKNOWN} <client-ip-addr> <dest-ip-addr> <client-port> <dest-port><CR><LF>
 */
static remoteip_parse_status_t remoteip_process_v1_header(conn_rec *c, remoteip_conn_config_t *conn_conf, proxy_header *hdr, apr_size_t len, apr_size_t *hdr_len) {
	char *end, *word, *host, *valid_addr_chars, *saveptr;
	char buf[sizeof(hdr->v1.line)];
	apr_port_t port;
	apr_status_t ret;
	apr_int32_t family;

#define GET_NEXT_WORD(field) \
	word = apr_strtok(NULL, " ", &saveptr); \
	if (!word) { \
		/* PRINTFc("APP: error no " field " found in header '%s'", hdr->v1.line); */ \
		return HDR_ERROR; \
	}

	end = memchr(hdr->v1.line, '\r', len - 1);
	if (!end || end[1] != '\n') {
		return HDR_NEED_MORE; /* partial or invalid header */
	}
	*end = '\0';
	*hdr_len = end + 2 - hdr->v1.line; /* skip header + CRLF */

	/* parse in separate buffer so have the original for error messages */
	strcpy(buf, hdr->v1.line);

	apr_strtok(buf, " ", &saveptr);

	/* parse family */
	GET_NEXT_WORD("family")
	if (strcmp(word, "UNKNOWN") == 0) {
		conn_conf->client_addr = c->client_addr;
		conn_conf->client_ip = c->client_ip;
		return HDR_DONE;
	}
	else if (strcmp(word, "TCP4") == 0) {
		family = APR_INET;
		valid_addr_chars = "0123456789.";
	}
	else if (strcmp(word, "TCP6") == 0) {
#if APR_HAVE_IPV6
		family = APR_INET6;
		valid_addr_chars = "0123456789abcdefABCDEF:";
#else
		//PRINTFc("APP: error unable to parse v6 address - APR is not compiled with IPv6 support");
		return HDR_ERROR;
#endif
	}
	else {
		//PRINTFc("APP: error unknown family '%s' in header '%s'", word, hdr->v1.line);
		return HDR_ERROR;
	}

	/* parse client-addr */
	GET_NEXT_WORD("client-address")

	if (strspn(word, valid_addr_chars) != strlen(word)) {
		//PRINTFc("APP: error invalid client-address '%s' found in " "header '%s'", word, hdr->v1.line);
		return HDR_ERROR;
	}

	host = word;

	/* parse dest-addr */
	GET_NEXT_WORD("destination-address")

	/* parse client-port */
	GET_NEXT_WORD("client-port")
	if (sscanf(word, "%hu", &port) != 1) {
		//PRINTFc("APP: error parsing port '%s' in header '%s'", word, hdr->v1.line);
		return HDR_ERROR;
	}

	/* parse dest-port */
	/* GET_NEXT_WORD("destination-port") - no-op since we don't care about it */

	/* create a socketaddr from the info */
	ret = apr_sockaddr_info_get(&conn_conf->client_addr, host, family, port, 0, c->pool);
	if (ret != APR_SUCCESS) {
		conn_conf->client_addr = NULL;
		//PRINTFc("APP: error converting family '%d', host '%s'," " and port '%hu' to sockaddr; header was '%s'", family, host, port, hdr->v1.line);
		return HDR_ERROR;
	}

	conn_conf->client_ip = apr_pstrdup(c->pool, host);

	return HDR_DONE;
}

static int remoteip_hook_pre_connection(conn_rec *c, void *csd) {
	remoteip_config_t *conf;
	remoteip_conn_config_t *conn_conf;
	int i;

	/* Establish master config in slave connections, so that request processing
	 * finds it. */
	if (c->master != NULL) {
		conn_conf = ap_get_module_config(c->master->conn_config, &app_ip_module);
		if (conn_conf) {
			ap_set_module_config(c->conn_config, &app_ip_module, conn_conf);
		}
		return DECLINED;
	}

	conf = ap_get_module_config(ap_server_conf->module_config, &app_ip_module);

	if (conf->enabled != 1)
		return DECLINED;

	/* mod_proxy creates outgoing connections - we don't want those */
	if (!remoteip_is_server_port(c->local_addr->port)) {
		return DECLINED;
	}

	/* add our filter */
	if (!ap_add_input_filter_handle(remoteip_filter, NULL, NULL, c)) {
		/* XXX: Shouldn't this WARN in log? */
		return DECLINED;
	}

	//PRINTFc("APP: success connection to %s:%hu", c->local_ip, c->local_addr->port);

	/* this holds the resolved proxy info for this connection */
	conn_conf = apr_pcalloc(c->pool, sizeof(*conn_conf));

	ap_set_module_config(c->conn_config, &app_ip_module, conn_conf);

	return OK;
}

/* Binary format:
 * <sig><cmd><proto><addr-len><addr>
 * sig = \x0D \x0A \x0D \x0A \x00 \x0D \x0A \x51 \x55 \x49 \x54 \x0A
 * cmd = <4-bits-version><4-bits-command>
 * 4-bits-version = \x02
 * 4-bits-command = {\x00|\x01} (\x00 = LOCAL: discard con info; \x01 = PROXY)
 * proto = <4-bits-family><4-bits-protocol>
 * 4-bits-family = {\x00|\x01|\x02|\x03} (AF_UNSPEC, AF_INET, AF_INET6, AF_UNIX)
 * 4-bits-protocol = {\x00|\x01|\x02} (UNSPEC, STREAM, DGRAM)
 */
static remoteip_parse_status_t remoteip_process_v2_header(conn_rec *c, remoteip_conn_config_t *conn_conf, proxy_header *hdr) {
	apr_status_t ret;

	switch (hdr->v2.ver_cmd & 0xF) {
		case 0x01: /* PROXY command */
			switch (hdr->v2.fam) {
				case 0x11: /* TCPv4 */
					ret = apr_sockaddr_info_get(&conn_conf->client_addr, NULL, APR_INET, ntohs(hdr->v2.addr.ip4.src_port), 0, c->pool);
					if (ret != APR_SUCCESS) {
						conn_conf->client_addr = NULL;
						//PRINTFc("APP: error creating sockaddr");
						return HDR_ERROR;
					}

					conn_conf->client_addr->sa.sin.sin_addr.s_addr =
							hdr->v2.addr.ip4.src_addr;
					break;

				case 0x21: /* TCPv6 */
#if APR_HAVE_IPV6
					ret = apr_sockaddr_info_get(&conn_conf->client_addr, NULL, APR_INET6, ntohs(hdr->v2.addr.ip6.src_port), 0, c->pool);
					if (ret != APR_SUCCESS) {
						conn_conf->client_addr = NULL;
						//PRINTFc("APP: error creating sockaddr");
						return HDR_ERROR;
					}
					memcpy(&conn_conf->client_addr->sa.sin6.sin6_addr.s6_addr, hdr->v2.addr.ip6.src_addr, 16);
					break;
#else
					//PRINTFc("APP: error APR is not compiled with IPv6 support");
					return HDR_ERROR;
#endif
				default:
					/* unsupported protocol */
					//PRINTFc("APP: error unsupported protocol %.2hx", (unsigned short)hdr->v2.fam);
					return HDR_ERROR;
			}
			break; /* we got a sockaddr now */
		default:
			/* not a supported command */
			//PRINTFc("APP: error unsupported command %.2hx", (unsigned short)hdr->v2.ver_cmd);
			return HDR_ERROR;
	}

	/* got address - compute the client_ip from it */
	ret = apr_sockaddr_ip_get(&conn_conf->client_ip, conn_conf->client_addr);
	if (ret != APR_SUCCESS) {
		conn_conf->client_addr = NULL;
		//PRINTFc("APP: error converting address to string");
		return HDR_ERROR;
	}
	return HDR_DONE;
}

static apr_size_t remoteip_get_v2_len(proxy_header *hdr) {
	return ntohs(hdr->v2.len);
}

/** Determine if this is a v1 or v2 PROXY header.
 */
static int remoteip_determine_version(conn_rec *c, const char *ptr) {
	proxy_header *hdr = (proxy_header *) ptr;
	/* assert len >= 14 */
	if (memcmp(&hdr->v2, v2sig, sizeof(v2sig)) == 0 && (hdr->v2.ver_cmd & 0xF0) == 0x20)
		return 2;
	else if (memcmp(hdr->v1.line, "PROXY ", 6) == 0)
		return 1;
	else
		return -1;
}

static apr_status_t remoteip_input_filter(ap_filter_t *f, apr_bucket_brigade *bb_out, ap_input_mode_t mode, apr_read_type_e block, apr_off_t readbytes) {
	apr_status_t ret;
	remoteip_filter_context *ctx = f->ctx;
	remoteip_conn_config_t *conn_conf;
	apr_bucket *b;
	remoteip_parse_status_t psts = HDR_NEED_MORE;
	const char *ptr;
	apr_size_t len;
	conn_rec *c = f->c;

	if (f->c->aborted)
		return APR_ECONNABORTED;
	/* allocate/retrieve the context that holds our header */
	if (!ctx) {
		ctx = f->ctx = apr_palloc(f->c->pool, sizeof(*ctx));
		ctx->rcvd = 0;
		ctx->need = MIN_HDR_LEN;
		ctx->version = 0;
		ctx->mode = AP_MODE_READBYTES;
		ctx->bb = apr_brigade_create(f->c->pool, f->c->bucket_alloc);
		ctx->done = 0;
	}
	/* Note: because we're a connection filter we can't remove ourselves
	 * when we're done, so we have to stay in the chain and just go into
	 * passthrough mode.
	 */
	if (ctx->done)
		return ap_get_brigade(f->next, bb_out, mode, block, readbytes);
	conn_conf = ap_get_module_config(f->c->conn_config, &app_ip_module);
	while (!ctx->done) {
		if (APR_BRIGADE_EMPTY(ctx->bb)) {
			apr_off_t got, want = ctx->need - ctx->rcvd;

			ret = ap_get_brigade(f->next, ctx->bb, ctx->mode, block, want);
			if (ret != APR_SUCCESS) {
				//PRINTFc("APP: error failed reading input");
				return ret;
			}

			ret = apr_brigade_length(ctx->bb, 1, &got);
			if (ret || got > want) {
				//PRINTFc("APP: error header too long, " "got %" APR_OFF_T_FMT " expected %" APR_OFF_T_FMT, got, want);
				f->c->aborted = 1;
				return APR_ECONNABORTED;
			}
		}
		if (APR_BRIGADE_EMPTY(ctx->bb))
			return block == APR_NONBLOCK_READ ? APR_SUCCESS : APR_EOF;

		while (!ctx->done && !APR_BRIGADE_EMPTY(ctx->bb)) {
			b = APR_BRIGADE_FIRST(ctx->bb);

			ret = apr_bucket_read(b, &ptr, &len, block);
			if (APR_STATUS_IS_EAGAIN(ret) && block == APR_NONBLOCK_READ)
				return APR_SUCCESS;
			if (ret != APR_SUCCESS)
				return ret;

			memcpy(ctx->header + ctx->rcvd, ptr, len);
			ctx->rcvd += len;

			apr_bucket_delete(b);
			psts = HDR_NEED_MORE;

			if (ctx->version == 0) {
				/* reading initial chunk */
				if (ctx->rcvd >= MIN_HDR_LEN) {
					ctx->version = remoteip_determine_version(f->c, ctx->header);
					if (ctx->version < 0) {
						psts = HDR_ERROR;
					}
					else if (ctx->version == 1) {
						ctx->mode = AP_MODE_GETLINE;
						ctx->need = sizeof(proxy_v1);
					}
					else if (ctx->version == 2) {
						ctx->need = MIN_V2_HDR_LEN;
					}
				}
			} else if (ctx->version == 1) {
				psts = remoteip_process_v1_header(f->c, conn_conf, (proxy_header *) ctx->header, ctx->rcvd, &ctx->need);
			} else if (ctx->version == 2) {
				if (ctx->rcvd >= MIN_V2_HDR_LEN) {
					ctx->need = MIN_V2_HDR_LEN +
						remoteip_get_v2_len((proxy_header *) ctx->header);
					if (ctx->need > sizeof(proxy_v2)) {
						//PRINTFc("APP: error protocol header length too long");
						f->c->aborted = 1;
						apr_brigade_destroy(ctx->bb);
						return APR_ECONNABORTED;
					}
				}
				if (ctx->rcvd >= ctx->need) {
					psts = remoteip_process_v2_header(f->c, conn_conf, (proxy_header *) ctx->header);
				}
			} else {
				//PRINTFc("APP: error unknown version " "%d", ctx->version);
				f->c->aborted = 1;
				apr_brigade_destroy(ctx->bb);
				return APR_ECONNABORTED;
			}

			switch (psts) {
				case HDR_ERROR:
					//PRINTFc("APP: success PROXY header not valid, switching to passthrough\n");
					if (ctx->rcvd > 0) {
						char *reinsert_data = apr_pmemdup(f->c->pool, ctx->header, ctx->rcvd);
						apr_bucket *header_bucket = apr_bucket_heap_create(reinsert_data, ctx->rcvd, NULL, f->c->bucket_alloc);
						APR_BRIGADE_INSERT_TAIL(bb_out, header_bucket);
					}
					while (!APR_BRIGADE_EMPTY(ctx->bb)) {
						apr_bucket *next = APR_BRIGADE_FIRST(ctx->bb);
						APR_BUCKET_REMOVE(next);
						APR_BRIGADE_INSERT_TAIL(bb_out, next);
					}
					ctx->done = 1;
					apr_brigade_destroy(ctx->bb);
					ctx->bb = NULL;
					return ap_get_brigade(f->next, bb_out, mode, block, readbytes);

				case HDR_DONE:
					ctx->done = 1;
					break;

				case HDR_NEED_MORE:
					break;
			}
		}
	}
	//PRINTFc("APP: success PROXY header valid %s:%hu v%d", conn_conf->client_ip, conn_conf->client_addr->port, ctx->version);
	if (ctx->rcvd > ctx->need || !APR_BRIGADE_EMPTY(ctx->bb)) {
		//PRINTFc("APP: error have data left over;  need=%" APR_SIZE_T_FMT ", rcvd=%" APR_SIZE_T_FMT ", brigade-empty=%d", ctx->need, ctx->rcvd, APR_BRIGADE_EMPTY(ctx->bb));
		f->c->aborted = 1;
		apr_brigade_destroy(ctx->bb);
		return APR_ECONNABORTED;
	}
	apr_brigade_destroy(ctx->bb);
	ctx->bb = NULL;
	return ap_get_brigade(f->next, bb_out, mode, block, readbytes);
}

static int remoteip_modify_request(request_rec *r) {
    conn_rec *c = r->connection;
    remoteip_conn_config_t *conn_config = ap_get_module_config(c->conn_config, &app_ip_module);
    if (conn_config && conn_config->client_addr) {
        c->client_ip = conn_config->client_ip;
        c->client_addr = conn_config->client_addr;
        r->useragent_addr = conn_config->client_addr;
        r->useragent_ip = conn_config->client_ip;
        //PRINTFr("APP: success REMOTE_ADDR set to %s", conn_config->client_ip);
        return OK;
    }
    return DECLINED;
}

static void *create_remoteip_server_config(apr_pool_t *p, server_rec *s) {
	remoteip_config_t *config = apr_pcalloc(p, sizeof(*config));
	config->pool = p;
	return config;
}

static void *merge_remoteip_server_config(apr_pool_t *p, void *globalv, void *serverv) {
	remoteip_config_t *config = (remoteip_config_t *) apr_palloc(p, sizeof(*config));
	return config;
}

static const char *moduleEnabledSet(cmd_parms *cmd, void *mconfig, const char *arg) {
    remoteip_config_t *config = ap_get_module_config(cmd->server->module_config, &app_ip_module);
    config->enabled = strcmp(arg, "on") == 0 ? 1 : 0;
	server_rec *s = cmd->server;
	PRINTF("AppIPEnabled: %s", arg);
	return NULL;
}

static const command_rec directives[] = {
	AP_INIT_TAKE1("AppIPEnabled", moduleEnabledSet, NULL, RSRC_CONF | ACCESS_CONF, "AppIP Enabled"),
	{NULL}
};

static void registerHooks(apr_pool_t *p) {
	remoteip_filter = ap_register_input_filter("APPIP_FILTER", remoteip_input_filter, NULL, AP_FTYPE_CONNECTION + 7);
	ap_hook_pre_connection(remoteip_hook_pre_connection, NULL, NULL, APR_HOOK_MIDDLE);
	ap_hook_post_read_request(remoteip_modify_request, NULL, NULL, APR_HOOK_FIRST);
}

module AP_MODULE_DECLARE_DATA app_ip_module = {
	STANDARD20_MODULE_STUFF, NULL, NULL, create_remoteip_server_config, merge_remoteip_server_config, directives, registerHooks
};
