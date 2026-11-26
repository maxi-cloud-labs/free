import { appSend, broadcast, webSend } from "./websocket";
import { adminPath, jsonRead } from "./common";
import { modulesInitA2o, moduleSetupDone, modulesSetup1, modulesSetup2, touchClick, wifiAddActivate, wifiScan } from "./modules";

//Variables
// Handled by app on the PI5 board (screen, keys, state), ignored without app
const appActions = [ "otp", "passcode", "shutdown", "key", "language", "state", "refresh-screen" ];

//Functions
// Escape raw control characters inside strings, accepted by cJSON but not by JSON.parse
function escapeControls(data: string): string {
	let st = "", inString = false, escaped = false;
	for (const c of data) {
		const code = c.charCodeAt(0);
		if (inString && !escaped && code < 0x20)
			st += "\\u" + code.toString(16).padStart(4, "0");
		else
			st += c;
		if (escaped)
			escaped = false;
		else if (inString && c === "\\")
			escaped = true;
		else if (c === "\"")
			inString = !inString;
	}
	return st;
}

function parse(data: string, orig: string) {
	try {
		return JSON.parse(data);
	} catch (e) {}
	try {
		return JSON.parse(escapeControls(data));
	} catch (e) {
		console.log("communication.ts: invalid JSON via " + orig + " (" + data.length + " bytes): " + (e as Error).message);
	}
	return null;
}

// orig is "websocket" (browsers and scripts), "app" (app itself or its BLE client) or "auth" (better-auth)
export async function communicationReceive(data: string, orig: string) {
	const el = parse(data, orig);
	const action = el?.a;
	if (typeof action !== "string")
		return;
	if (action === "forward") {
		if (orig === "app")
			webSend(el.p);
	} else if (appActions.includes(action)) {
		// app never forwards those, avoid any loop
		if (orig !== "app")
			appSend(el);
	} else if (action === "pam") {
		if (el.o === "oath_success")
			appSend({ a:"otp", v:0 });
	} else if (action === "setup1") {
		touchClick();
		modulesSetup1(el, false);
		broadcast({ a:"setup", success:1 });
	} else if (action === "setup2") {
		touchClick();
		modulesSetup2();
	} else if (action === "status") {
		moduleSetupDone(el.module);
		broadcast(el);
	} else if (action === "cloud") {
		// Only what the setup page needs: not the AI keys or frp token to any BLE or websocket client
		const cloud = jsonRead(adminPath + "_config_/_cloud_.json") ?? {};
		broadcast({ a:"cloud", info:cloud.info, hardware:cloud.hardware });
	} else if (action === "wifi-scan")
		broadcast(await wifiScan());
	else if (action === "wifi") {
		if (orig === "auth" && !wifiAddActivate(el.wifi?.ssid, el.wifi?.password))
			console.log("communication.ts: wifi not applied");
	} else if (action === "alert")
		console.log("communication.ts: alert type:" + el.type + " name:" + el.name);
	else if (action === "refresh-webserver") {
		touchClick();
		modulesInitA2o();
	} else if (action !== "date")
		console.log("communication.ts: action:" + action + " via " + orig, el);
}
