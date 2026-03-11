#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <NetworkManager.h>
#include <nm-utils.h>
#include <nm-remote-connection.h>
#include "cJSON.h"
#include "macro.h"

#define DEBUG

//Private variables
static gboolean connection_done;
static char SSID[256];
static char psk[65];

//Functions
static int wpaPassphrase(const char *ssid, const char *pwd, char *psk) {
	uint8_t p[32];
	size_t pwdLen = strlen(pwd);
	if (pwdLen < 8 || pwdLen > 63) {
		PRINTF("Passphrase must be between 8 and 63 characters\n");
		return -1;
	}
	if (PKCS5_PBKDF2_HMAC_SHA1(pwd, pwdLen, (const unsigned char *)ssid, strlen(ssid), 4096, 32, p) == 0) {
		PRINTF("Error computing PSK\n");
		return -1;
	}
	for (int i = 0; i < 32; i++)
		sprintf(psk + i * 2, "%02x", p[i]);
	return 0;
}

int wiFiConfigRead(const char *name, char *content) {
	char path[256];
	snprintf(path, sizeof(path), NM_CONFIG_PATH ".nmconnection", name);
	FILE *pf = fopen(path, "r");
	if (pf) {
		int ret = fread(content, 2048, 1, pf);
		fclose(pf);
		return ret;
	}
	return 0;
}

int wiFiConfigWrite(const char *name, const char *ssid, const char *pwd) {
	memset(psk, 0, 65);
	if (wpaPassphrase(ssid, pwd, psk) != 0)
		return -1;
	char path[256];
	snprintf(path, sizeof(path), NM_CONFIG_PATH ".nmconnection", name);
	FILE *pf = fopen(path, "w");
	if (pf) {
		char sz[2048];
		snprintf(sz, sizeof(sz), "\
[connection]\n\
id=preconfigured\n\
uuid=d4bed19f-5835-45ad-8bd2-39bdce18b9cc\n\
type=wifi\n\
[wifi]\n\
mode=infrastructure\n\
ssid=%s\n\
hidden=false\n\
[ipv4]\n\
method=auto\n\
[ipv6]\n\
addr-gen-mode=default\n\
method=auto\n\
[proxy]\n\
[wifi-security]\n\
key-mgmt=wpa-psk\n\
psk=%s", ssid, psk);
		fwrite(sz, strlen(sz), 1, pf);
		fclose(pf);
	}
	memset(psk, 0, 65);
	return 0;
}

static void device_state_changed_cb(NMDevice *device, GParamSpec *pspec, gpointer user_data) {
	NMDeviceState state = nm_device_get_state(device);
	const char *state_str;
	switch (state) {
		case NM_DEVICE_STATE_ACTIVATED:
			state_str = "activated";
			PRINTF("WiFi: Connected\n");
			connection_done = TRUE;
			break;
		case NM_DEVICE_STATE_FAILED:
			state_str = "failed";
			PRINTF("WiFi: Failed to connect\n");
			connection_done = TRUE;
			break;
			break;
	}
}

static void connection_added_cb(NMClient *client, GAsyncResult *result, gpointer user_data) {
	NMActiveConnection *active_conn;
	GVariant *ret;
	GError *error = NULL;
	active_conn = nm_client_add_and_activate_connection2_finish(client, result, &ret, &error);
	if (!active_conn) {
		PRINTF("WiFi: Failed to add (%s)\n", error->message);
		g_error_free(error);
		connection_done = TRUE;
		return;
	}
	PRINTF("WiFi: Added\n");
	g_object_unref(active_conn);
}

static void *wiFiAddActivate_t(void *arg) {
	NMClient *client = nm_client_new(NULL, NULL);
	if (!client) {
		PRINTF("WiFi: Error initialization\n");
		return 0;
	}
	const GPtrArray *devices = nm_client_get_devices(client);
	NMDevice *wifi_device = NULL;
	for (guint i = 0; i < devices->len; i++) {
		NMDevice *device = g_ptr_array_index(devices, i);
		if (nm_device_get_device_type(device) == NM_DEVICE_TYPE_WIFI) {
			wifi_device = device;
			PRINTF("WiFi: Device Found: %s\n", nm_device_get_iface(device));
			break;
		}
	}
	if (!wifi_device) {
		PRINTF("WiFi: No device found\n");
		g_object_unref(client);
		return 0;
	}
	NMConnection *connection = nm_simple_connection_new();
	NMSettingConnection *s_con = (NMSettingConnection *)nm_setting_connection_new();
	g_object_set(s_con, NM_SETTING_CONNECTION_ID, "_cloud_", NM_SETTING_CONNECTION_UUID, nm_utils_uuid_generate(), NM_SETTING_CONNECTION_TYPE, NM_SETTING_WIRELESS_SETTING_NAME, NULL);
	nm_connection_add_setting(connection, NM_SETTING(s_con));

	GBytes *ssid_bytes = g_bytes_new(SSID, strlen(SSID));
	NMSettingWireless *s_wifi = (NMSettingWireless *)nm_setting_wireless_new();
	g_object_set(s_wifi, NM_SETTING_WIRELESS_SSID, ssid_bytes, NM_SETTING_WIRELESS_MODE, "infrastructure", NULL);
	nm_connection_add_setting(connection, NM_SETTING(s_wifi));
	g_bytes_unref(ssid_bytes);

	NMSettingIP4Config *s_ip4 = (NMSettingIP4Config *)nm_setting_ip4_config_new();
	g_object_set(s_ip4, NM_SETTING_IP_CONFIG_METHOD, "auto", NULL);
	nm_connection_add_setting(connection, NM_SETTING(s_ip4));

	NMSettingWirelessSecurity *s_wsec = (NMSettingWirelessSecurity *)nm_setting_wireless_security_new();
	g_object_set(s_wsec, NM_SETTING_WIRELESS_SECURITY_KEY_MGMT, "wpa-psk", NM_SETTING_WIRELESS_SECURITY_PSK, psk, NULL);
	nm_connection_add_setting(connection, NM_SETTING(s_wsec));
	memset(psk, 0, 65);

	GError *error = NULL;
	if (!nm_connection_verify(connection, &error)) {
		PRINTF("WiFi: Connection verification failed: %s\n", error->message);
		g_error_free(error);
		g_object_unref(connection);
		g_object_unref(client);
		return 0;
	}

	nm_client_add_and_activate_connection2(client, connection, wifi_device, NULL, NULL, NULL, (GAsyncReadyCallback)connection_added_cb, NULL);
	g_signal_connect(wifi_device, "notify::state", G_CALLBACK(device_state_changed_cb), NULL);
	connection_done = FALSE;
	while (!connection_done) {
		g_main_context_iteration(g_main_context_default(), FALSE);
		usleep(100 * 1000);
	}

	g_object_unref(connection);
	g_object_unref(client);
	return 0;
}

int wiFiAddActivate(const char *ssid, const char *pwd) {
	strcpy(SSID, ssid);
	memset(psk, 0, 65);
	if (wpaPassphrase(ssid, pwd, psk) != 0)
		return -1;
	pthread_t pthEW;
	pthread_create(&pthEW, NULL, wiFiAddActivate_t, NULL);
	return 0;
}

cJSON *wiFiScan() {
	NMClient *client = nm_client_new(NULL, NULL);
	if (!client) {
		return NULL;
	}
	const GPtrArray *devices = nm_client_get_devices(client);
	NMDevice *wifi_device = NULL;
	for (guint i = 0; i < devices->len; i++) {
		NMDevice *device = g_ptr_array_index(devices, i);
		if (nm_device_get_device_type(device) == NM_DEVICE_TYPE_WIFI) {
			wifi_device = device;
			break;
		}
	}
	if (!wifi_device) {
		g_object_unref(client);
		return NULL;
	}
	cJSON *ret = cJSON_CreateObject();
	cJSON *ssid_list = cJSON_CreateArray();
	cJSON_AddItemToObject(ret, "ssids", ssid_list);
	NMDeviceWifi *wifi_dev = NM_DEVICE_WIFI(wifi_device);
	nm_device_wifi_request_scan(wifi_dev, NULL, NULL);
	const GPtrArray *aps = nm_device_wifi_get_access_points(wifi_dev);
	if (aps) {
		for (guint i = 0; i < aps->len; i++) {
			NMAccessPoint *ap = g_ptr_array_index(aps, i);
			GBytes *ssid_bytes = nm_access_point_get_ssid(ap);
			if (ssid_bytes) {
				gsize size;
				const guint8 *data = g_bytes_get_data(ssid_bytes, &size);
				char *ssid_utf8 = nm_utils_ssid_to_utf8(data, size);
				guint8 strength = nm_access_point_get_strength(ap);
				PRINTF("Wifi: %s (strength: %d%%)\n", ssid_utf8, strength);
				cJSON *item = cJSON_CreateObject();
				cJSON_AddStringToObject(item, "ssid", ssid_utf8);
				cJSON_AddNumberToObject(item, "strength", strength);
				cJSON_AddItemToArray(ssid_list, item);
				g_free(ssid_utf8);
			}
		}
	}
	g_object_unref(client);
	return ret;
}

void wiFiPrint() {
	NMClient *client = nm_client_new(NULL, NULL);
	if (!client) {
		PRINTF("WiFi: Error initialization\n");
		return;
	}
	const GPtrArray *devices = nm_client_get_devices(client);
	NMDevice *wifi_device = NULL;
	for (guint i = 0; i < devices->len; i++) {
		NMDevice *device = g_ptr_array_index(devices, i);
		if (nm_device_get_device_type(device) == NM_DEVICE_TYPE_WIFI) {
			wifi_device = device;
			PRINTF("WiFi: Device Found: %s\n", nm_device_get_iface(device));
			break;
		}
	}
	if (!wifi_device) {
		PRINTF("WiFi: No device found\n");
		g_object_unref(client);
		return;
	}
	PRINTF("WiFi: Saved connections:\n");
	const GPtrArray *saved_connections = nm_client_get_connections(client);
	for (guint i = 0; i < saved_connections->len; i++) {
		NMConnection *conn = NM_CONNECTION(g_ptr_array_index(saved_connections, i));
		NMSettingConnection *s_con = nm_connection_get_setting_connection(conn);
		const char *conn_id = nm_setting_connection_get_id(s_con);
		NMSettingWireless *s_wifi = nm_connection_get_setting_wireless(conn);
		if (s_wifi) {
			const GBytes *ssid_bytes = nm_setting_wireless_get_ssid(s_wifi);
			if (ssid_bytes) {
				gsize ssid_len;
				const guint8 *ssid_data = g_bytes_get_data((GBytes *)ssid_bytes, &ssid_len);
				char *ssid_utf8 = nm_utils_ssid_to_utf8(ssid_data, ssid_len);
				PRINTF("WiFi: %s (SSID: %s)\n", conn_id, ssid_utf8);
				g_free(ssid_utf8);
			}
		}
	}
	PRINTF("WiFi: Active connections:\n");
	const GPtrArray *active_conns = nm_client_get_active_connections(client);
	for (guint i = 0; i < active_conns->len; i++) {
		NMActiveConnection *ac = NM_ACTIVE_CONNECTION(g_ptr_array_index(active_conns, i));
		NMRemoteConnection *rconn = NM_REMOTE_CONNECTION(nm_active_connection_get_connection(ac));
		NMConnection *conn = NM_CONNECTION(rconn);
		if (!conn) continue;
		NMSettingConnection *s_con = nm_connection_get_setting_connection(conn);
		const char *conn_id = nm_setting_connection_get_id(s_con);
		const GPtrArray *ac_devices = nm_active_connection_get_devices(ac);
		gboolean is_wifi_conn = FALSE;
		for (guint j = 0; j < ac_devices->len; j++) {
			if (g_ptr_array_index(ac_devices, j) == wifi_device) {
				is_wifi_conn = TRUE;
				break;
			}
		}
		if (is_wifi_conn) {
			NMSettingWireless *s_wifi = nm_connection_get_setting_wireless(conn);
			if (s_wifi) {
				const GBytes *ssid_bytes = nm_setting_wireless_get_ssid(s_wifi);
				if (ssid_bytes) {
					gsize ssid_len;
					const guint8 *ssid_data = g_bytes_get_data((GBytes *)ssid_bytes, &ssid_len);
					char *ssid_utf8 = nm_utils_ssid_to_utf8(ssid_data, ssid_len);
					PRINTF("WiFi: %s (SSID: %s, State: %s)\n", conn_id, ssid_utf8, nm_active_connection_get_state(ac) == NM_ACTIVE_CONNECTION_STATE_ACTIVATED ? "ACTIVATED" : "DEACTIVATED");
					g_free(ssid_utf8);
				}
			}
		}
	}
	NMDeviceWifi *wifi_dev = NM_DEVICE_WIFI(wifi_device);
	nm_device_wifi_request_scan(wifi_dev, NULL, NULL);
	const GPtrArray *aps = nm_device_wifi_get_access_points(wifi_dev);
	PRINTF("WiFi: Available SSIDs:\n");
	if (aps) {
		for (guint i = 0; i < aps->len; i++) {
			NMAccessPoint *ap = g_ptr_array_index(aps, i);
			GBytes *ssid_bytes = nm_access_point_get_ssid(ap);
			if (ssid_bytes) {
				gsize size;
				const guint8 *data = g_bytes_get_data(ssid_bytes, &size);
				char *ssid_utf8 = nm_utils_ssid_to_utf8(data, size);
				guint8 strength = nm_access_point_get_strength(ap);
				PRINTF("Wifi: %s (strength: %d%%)\n", ssid_utf8, strength);
				g_free(ssid_utf8);
			}
		}
	}
	g_object_unref(client);
	return;
}

int wifiStatus(const char *name, const char *ssid) {
	NMClient *client = nm_client_new(NULL, NULL);
	if (!client) {
		PRINTF("WiFi: Error initialization\n");
		return -1;
	}
	const GPtrArray *active_conns = nm_client_get_active_connections(client);
	for (guint i = 0; i < active_conns->len; i++) {
		NMActiveConnection *ac = NM_ACTIVE_CONNECTION(g_ptr_array_index(active_conns, i));
		if (name != NULL) {
			const char *conn_id = nm_active_connection_get_id(ac);
			if (conn_id && g_strcmp0(conn_id, name) == 0) {
				int ret = nm_active_connection_get_state(ac) == NM_ACTIVE_CONNECTION_STATE_ACTIVATED ? 2 : 1;
				g_object_unref(client);
				return ret;
			}
		}
		if (ssid != NULL) {
			NMRemoteConnection *rconn = NM_REMOTE_CONNECTION(nm_active_connection_get_connection(ac));
			NMConnection *conn = NM_CONNECTION(rconn);
			NMSettingWireless *s_wifi = nm_connection_get_setting_wireless(conn);
			if (s_wifi) {
				const GBytes *ssid_bytes = nm_setting_wireless_get_ssid(s_wifi);
				if (ssid_bytes) {
					gsize ssid_len;
					const guint8 *ssid_data = g_bytes_get_data((GBytes *)ssid_bytes, &ssid_len);
					char *ssid_utf8 = nm_utils_ssid_to_utf8(ssid_data, ssid_len);
					if (ssid_utf8 && strcmp(ssid_utf8, ssid) == 0) {
						g_free(ssid_utf8);
						int ret = nm_active_connection_get_state(ac) == NM_ACTIVE_CONNECTION_STATE_ACTIVATED ? 2 : 1;
						g_object_unref(client);
						return ret;
					}
				}
			}
		}
	}

	const GPtrArray *saved_conns = nm_client_get_connections(client);
	for (guint i = 0; i < saved_conns->len; i++) {
		NMConnection *conn = NM_CONNECTION(g_ptr_array_index(saved_conns, i));
		NMSettingConnection *s_con = nm_connection_get_setting_connection(conn);
		if (name != NULL) {
			const char *conn_id = nm_setting_connection_get_id(s_con);
			if (conn_id && g_strcmp0(conn_id, name) == 0) {
				g_object_unref(client);
				return 1;
			}
		}
		if (ssid != NULL) {
			NMSettingWireless *s_wifi = nm_connection_get_setting_wireless(conn);
			if (s_wifi) {
				const GBytes *ssid_bytes = nm_setting_wireless_get_ssid(s_wifi);
				if (ssid_bytes) {
					gsize ssid_len;
					const guint8 *ssid_data = g_bytes_get_data((GBytes *)ssid_bytes, &ssid_len);
					char *ssid_utf8 = nm_utils_ssid_to_utf8(ssid_data, ssid_len);
					if (ssid_utf8 && strcmp(ssid_utf8, ssid) == 0) {
						g_free(ssid_utf8);
						g_object_unref(client);
						return 1;
					}
				}
			}
		}
	}
	return 0;
}

int wifiDelete(const char *name, const char *ssid) {
	NMClient *client = nm_client_new(NULL, NULL);
	if (!client) {
		PRINTF("WiFi: Error initialization\n");
		return -1;
	}
	const GPtrArray *saved_conns = nm_client_get_connections(client);
	for (guint i = 0; i < saved_conns->len; i++) {
		NMConnection *conn = NM_CONNECTION(g_ptr_array_index(saved_conns, i));
		NMRemoteConnection *rconn = NM_REMOTE_CONNECTION(conn);
		NMSettingConnection *s_con = nm_connection_get_setting_connection(conn);
		if (name != NULL) {
			const char *conn_id = nm_setting_connection_get_id(s_con);
			if (conn_id && g_strcmp0(conn_id, name) == 0) {
				int ret = nm_remote_connection_delete(rconn, NULL, NULL);
				g_object_unref(client);
				return ret;
			}
		}
		if (ssid != NULL) {
			NMSettingWireless *s_wifi = nm_connection_get_setting_wireless(conn);
			if (s_wifi) {
				const GBytes *ssid_bytes = nm_setting_wireless_get_ssid(s_wifi);
				if (ssid_bytes) {
					gsize ssid_len;
					const guint8 *ssid_data = g_bytes_get_data((GBytes *)ssid_bytes, &ssid_len);
					char *ssid_utf8 = nm_utils_ssid_to_utf8(ssid_data, ssid_len);
					if (ssid_utf8 && strcmp(ssid_utf8, ssid) == 0) {
						int ret = nm_remote_connection_delete(rconn, NULL, NULL);
						g_free(ssid_utf8);
						g_object_unref(client);
						return ret;
					}
				}
			}
		}
	}
	return 0;
}
