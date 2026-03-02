#ifndef MODULE_H
#define MODULE_H

//Struct
typedef struct {
	const char *cloudname;
	const char *jwkPem;
	const char *name;
	cJSON *permissions;
	int autologin;
	apr_shm_t *shm_hits;
	apr_shm_t * shm_lasttime;
	apr_proc_mutex_t *mutex;
} configVH;

typedef struct {
	const char *cloudname;
	const char *jwkPem;
	int autologin;
} configS;

//Global variable
extern module AP_MODULE_DECLARE_DATA app_module;

//Global function
int authorization2(request_rec *r, const char *permission, int strict);

#endif
