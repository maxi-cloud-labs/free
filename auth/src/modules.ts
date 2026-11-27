import { mkdirSync, writeFileSync, copyFileSync } from "fs";
import { execFile, spawn } from "child_process";
import { pbkdf2Sync } from "crypto";
import { watch } from "chokidar";
import { buildApache2Conf, buildApache2ConfBeforeSetup } from "./apache2";
import { appSend, broadcast } from "./websocket";
import { adminPath, frpPath, webPath, jsonRead, jsonWrite, has, num, children, printArray } from "./common";
import { getExternalIP } from "./auth";

//Define
const PERFORMANCE = true;
const MAIN_DOMAIN = "maxi.cloud";
const SHORT_DOMAIN = "maxi.cloud";
const RESET = "/usr/local/modules/_core_/reset.sh";
const authURL = "http://localhost:8091/auth/";
const cloudPath = adminPath + "_config_/_cloud_.json";
const modulesPath = adminPath + "_config_/_modules_.json";
const modulesDefaultPath = webPath + "assets/modulesdefault.json";

//Variables
let inSetup = false;
let ipExternal = "";
let modulesLock: Promise<void> = Promise.resolve();

//Functions
// Serialize like the modulesMutex of the C version
function withLock(fn: () => Promise<void>): Promise<void> {
	modulesLock = modulesLock.then(fn).catch((e) => console.error("modules.ts:", e));
	return modulesLock;
}

// Run a command with its output in the log, resolve with its exit code
function run(cmd: string, args: string[]): Promise<number> {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { stdio:["ignore", "inherit", "inherit"] });
		child.on("error", (e) => {
			console.error("modules.ts: " + cmd + " " + e.message);
			resolve(-1);
		});
		child.on("close", (code) => resolve(code ?? -1));
	});
}

// Run a command and resolve with its stdout, even on non-zero exit code
function capture(cmd: string, args: string[]): Promise<string> {
	return new Promise((resolve) => {
		execFile(cmd, args, (error, stdout) => resolve(stdout ?? ""));
	});
}

// Hardware feedback, only effective when app runs (PI5 board)
function logicSetup(name: string, percentage: number, translate = false) {
	appSend({ a:"setup-progress", n:name, p:percentage, t:translate ? 1 : 0 });
}

function logicMessage(message: number, ok: number) {
	appSend({ a:"message", m:message, o:ok });
}

function buzzer(n: number) {
	appSend({ a:"buzzer", n });
}

function jingle() {
	appSend({ a:"jingle" });
}

export function touchClick() {
	appSend({ a:"touch" });
}

async function serviceAction(name: string, action: string) {
	const verbs = { ReloadOrRestartUnit:"reload-or-restart", RestartUnit:"restart", StopUnit:"stop" };
	console.log("Service: " + name + " " + action);
	// Like #ifndef DESKTOP in the C version: no systemctl in development
	if (process.env.PRODUCTION !== "true")
		return;
	// --no-block: only enqueue the job, as the D-Bus call of the C version
	if (await run("systemctl", ["--no-block", verbs[action], name]) != 0)
		console.log("Failed unit " + name);
}

// 1 if active, 0 if not, -1 on error, for each service
async function serviceStates(names: string[]): Promise<number[]> {
	const lines = (await capture("systemctl", ["is-active", ...names.map((n) => n + ".service")])).trim().split("\n");
	if (lines.length != names.length)
		return names.map(() => -1);
	return lines.map((l) => l === "active" ? 1 : 0);
}

function fqdnInit(elCloud): string[] {
	const elCloudAll = elCloud?.info;
	const fqdn = [elCloudAll?.name + "." + MAIN_DOMAIN, elCloudAll?.shortname + "." + SHORT_DOMAIN];
	const domain = elCloudAll?.domain;
	if (typeof domain === "string" && domain.length > 0)
		fqdn.push(domain);
	return fqdn;
}

async function modulesWorkApache2(elCloud, modulesDefault, modules, fqdn: string[]) {
	mkdirSync(adminPath + "apache2", { recursive:true, mode:0o775 });
	if (modules?.apache2?.overwrite === true)
		console.log("Apache2: No creation of main.conf");
	else
		buildApache2Conf(elCloud, modulesDefault, modules, fqdn, ipExternal);
	await serviceAction("apache2.service", "ReloadOrRestartUnit");
}

function frpConf(elCloud, elModule, elModule2, elModule3, fqdn: string[]): string {
	const port = num(elModule?.bindingPort);
	let st = "serverAddr = \"server.maxi.cloud\"\n" +
		"serverPort = " + port + "\n" +
		"auth.method = \"token\"\n" +
		"auth.tokenSource.type = \"file\"\n" +
		"auth.tokenSource.file.path = \"" + frpPath + "token.txt\"\n" +
		"user = \"" + elCloud?.info?.name + "\"\n" +
		"metadatas.token = \"" + elModule3?.token + "\"\n" +
		"webServer.addr = \"127.0.0.1\"\n" +
		"webServer.port = 7400\n\n";
	for (const [protocol, elModuleSt] of Object.entries<any>(elModule?.protocols ?? {})) {
		const elModule2St = elModule2?.protocols?.[protocol];
		const elModule3St = elModule3?.protocols?.[protocol];
		if (elModule2St?.enabled !== true && elModuleSt?.enabled !== true)
			continue;
		const type = typeof elModuleSt?.type === "string" ? elModuleSt.type : "";
		const localPort = num(elModuleSt?.localPort);
		const remotePort = num(elModule3St?.remotePort);
		st += "[[proxies]]\nname = \"" + protocol + "\"\ntype = \"" + type + "\"\n" +
			(type.startsWith("http") ? "transport.proxyProtocolVersion = \"v2\"\n" : "") +
			"localIP = \"localhost\"\nlocalPort = " + localPort + "\n";
		if (type.startsWith("http")) {
			st += "customDomains = [\n";
			st += printArray(1, "\"", "\"", "", fqdn, "\",\n");
			st += printArray(1, "\"", "\"", "*", fqdn, "\",\n");
			st += "]\n\n";
		} else if (type === "tcpmux")
			st += "multiplexer = \"httpconnect\"\ncustomDomains = [ \"" + protocol + "." + fqdn[0] + "\" ]\n\n";
		else if (remotePort > 0)
			st += "remotePort= " + remotePort + "\n\n";
	}
	return st;
}

async function modulesWork(elCloud, modulesDefault, modules, fqdn: string[]) {
	if (!has(elCloud, "info")) {
		buildApache2ConfBeforeSetup();
		await serviceAction("apache2.service", "ReloadOrRestartUnit");
		return;
	}
	for (const [name, elModule] of Object.entries<any>(modulesDefault ?? {})) {
		if (name === "apache2")
			await modulesWorkApache2(elCloud, modulesDefault, modules, fqdn);
		else if (name === "frp") {
			mkdirSync(adminPath + "frp", { recursive:true, mode:0o775 });
			try {
				writeFileSync(adminPath + "frp/frpc.toml", frpConf(elCloud, elModule, modules?.frp, elCloud?.frp, fqdn), "utf-8");
			} catch (e) {
				console.error("modules.ts: frpc.toml", e);
			}
			await serviceAction("frp.service", "RestartUnit");
		} else if (has(elModule, "services")) {
			const elModule2 = modules?.[name];
			if (has(elModule2, "setupDone")) {
				const elEnabled = has(elModule2, "enabled") ? elModule2.enabled : elModule.enabled;
				const services = children(elModule.services).filter((s) => typeof s === "string");
				const states = await serviceStates(services);
				services.forEach((service, i) => {
					if (states[i] != (elEnabled === true ? 1 : 0))
						console.log("Should " + (elEnabled === true ? "ReloadOrRestartUnit" : "StopUnit") + " " + service);
				});
			}
		}
	}
}

function modulesInit_(apache2Only: boolean): Promise<void> {
	return withLock(async () => {
		if (ipExternal.length == 0)
			ipExternal = await getExternalIP();
		console.log("moduleInit_");
		const cloud = jsonRead(cloudPath) ?? {};
		const modulesDefault = jsonRead(modulesDefaultPath);
		const modules = jsonRead(modulesPath) ?? {};
		const fqdn = fqdnInit(cloud);
		// Before setup, apache2 only refresh also needs the configuration before setup
		if (apache2Only && has(cloud, "info"))
			await modulesWorkApache2(cloud, modulesDefault, modules, fqdn);
		else
			await modulesWork(cloud, modulesDefault, modules, fqdn);
	});
}

export function modulesInit() {
	if (inSetup)
		return;
	modulesInit_(false);
}

export function modulesInitA2o() {
	if (inSetup)
		return;
	modulesInit_(true);
}

// Called on any change of _modules_.json, as the inotify watch of the C version
export function modulesWatch() {
	watch(modulesPath, { persistent:true }).on("change", () => modulesInitA2o());
}

export function moduleSetupDone(moduleSt) {
	if (typeof moduleSt !== "string" || moduleSt.length == 0)
		return;
	withLock(async () => {
		const modules = jsonRead(modulesPath) ?? {};
		if (modules[moduleSt]?.setupDone !== true) {
			modules[moduleSt] = { ...modules[moduleSt], setupDone:true };
			jsonWrite(modules, modulesPath);
		}
	});
}

async function setupOne(i: number, total: number, name: string, root: number, modules) {
	const start = Date.now();
	const p = Math.min(99, Math.max(1, Math.floor(i * 100 / total)));
	logicSetup(name, p);
	broadcast({ a:"status", progress:p, module:name, state:"start" });
	await run("sudo", [RESET, "-u", String(root), name]);
	modules[name] = { ...modules[name], setupDone:true };
	jsonWrite(modules, modulesPath);
	if (PERFORMANCE)
		console.log("Setup " + name + ": " + ((Date.now() - start) / 1000).toFixed(1) + "s");
}

function setupDone(modules, name: string): boolean {
	return modules?.[name]?.setupDone === true;
}

async function setupLoop(counter: { i:number }, total: number, cloud, modulesDefault, modules, fqdn: string[], priority: boolean) {
	for (const [name, elModule] of Object.entries<any>(modulesDefault ?? {})) {
		if (!has(elModule, "setup") || has(elModule, "setupPriority") != priority)
			continue;
		for (const dep of children(elModule.setupDependencies)) {
			const elModuleDep = modulesDefault[dep];
			if (has(elModuleDep, "setup") && !setupDone(modules, dep)) {
				await setupOne(counter.i++, total, dep, has(elModuleDep, "setupRoot") ? 1 : 0, modules);
				buildApache2Conf(cloud, modulesDefault, modules, fqdn, ipExternal);
				await serviceAction("apache2.service", "ReloadOrRestartUnit");
			}
		}
		if (!setupDone(modules, name)) {
			await setupOne(counter.i++, total, name, has(elModule, "setupRoot") ? 1 : 0, modules);
			buildApache2Conf(cloud, modulesDefault, modules, fqdn, ipExternal);
			await serviceAction("apache2.service", "ReloadOrRestartUnit");
		}
	}
}

async function wifiCallback() {
	console.log("WifiCallback");
	if (!inSetup) {
		console.log("Reinit Better Auth");
		try {
			await fetch(authURL + "reinit");
		} catch (e) {}
		modulesInit();
	}
}

// Add and activate the _cloud_ Wi-Fi connection, cb called once done (successfully or not)
export function wifiAddActivate(ssid, pwd, cb?: () => void): boolean {
	if (typeof ssid !== "string" || typeof pwd !== "string" || ssid.length == 0)
		return false;
	if (pwd.length < 8 || pwd.length > 63) {
		console.log("Passphrase must be between 8 and 63 characters");
		return false;
	}
	// Pass the WPA PSK rather than the passphrase, as the C version did
	const psk = pbkdf2Sync(pwd, ssid, 4096, 32, "sha1").toString("hex");
	(async () => {
		await capture("nmcli", ["connection", "delete", "_cloud_"]);
		let ret = await run("nmcli", ["connection", "add", "type", "wifi", "con-name", "_cloud_", "ssid", ssid, "802-11-wireless.mode", "infrastructure", "ipv4.method", "auto", "wifi-sec.key-mgmt", "wpa-psk", "wifi-sec.psk", psk]);
		if (ret == 0)
			ret = await run("nmcli", ["connection", "up", "_cloud_"]);
		console.log("WiFi: " + (ret == 0 ? "Connected" : "Failed to connect"));
		if (cb)
			cb();
	})();
	return true;
}

export async function wifiScan() {
	const ssids: { ssid:string, strength:number }[] = [];
	const out = await capture("nmcli", ["-t", "-f", "SSID,SIGNAL", "device", "wifi", "list", "--rescan", "auto"]);
	for (const line of out.split("\n")) {
		// Terse mode escapes ':' and '\' in values
		const match = line.match(/^(.*):(\d+)$/);
		if (!match || match[1].length == 0)
			continue;
		const ssid = match[1].replace(/\\(.)/g, "$1");
		console.log("Wifi: " + ssid + " (strength: " + match[2] + "%)");
		ssids.push({ ssid, strength:parseInt(match[2]) });
	}
	return { ssids };
}

export async function modulesSetup1(elSetup1, doSetup2: boolean) {
	if (inSetup) {
		console.log("modulesSetup1 not run because inSetup");
		return;
	}
	if (has(jsonRead(cloudPath), "info")) {
		console.log("modulesSetup1 not run because cloud.info exists");
		return;
	}
	const elCloud = elSetup1?.cloud;
	if (elCloud === null || typeof elCloud !== "object") {
		console.log("modulesSetup1 not run because cloud is missing");
		return;
	}
	inSetup = true;
	try {
		logicSetup("Initialization", 0, true);
		const timezone = elCloud.hardware?.timezone;
		if (typeof timezone === "string" && timezone.length > 0)
			await run("sudo", [RESET, "-t", timezone]);
		const wifi = elSetup1.connectivity?.wifi;
		if (wifi?.ssid && wifi?.password)
			wifiAddActivate(wifi.ssid, wifi.password, wifiCallback);
		if (has(elCloud, "info"))
			elCloud.info.setup = "progress1";
		jsonWrite(elCloud, cloudPath);

		mkdirSync(adminPath + "letsencrypt", { recursive:true, mode:0o775 });
		const fullchain = elSetup1.letsencrypt?.fullchain;
		const privkey = elSetup1.letsencrypt?.privatekey;
		try {
			if (typeof fullchain === "string" && fullchain.length > 0 && typeof privkey === "string" && privkey.length > 0) {
				writeFileSync(adminPath + "letsencrypt/fullchain.pem", fullchain, "utf-8");
				writeFileSync(adminPath + "letsencrypt/privkey.pem", privkey, { encoding:"utf-8", mode:0o600 });
			} else {
				copyFileSync("/usr/local/modules/apache2/self-fullchain.pem", adminPath + "letsencrypt/fullchain.pem");
				copyFileSync("/usr/local/modules/apache2/self-privkey.pem", adminPath + "letsencrypt/privkey.pem");
			}
		} catch (e) {
			console.error("modules.ts: letsencrypt", e);
		}

		try {
			await fetch(authURL + "sign-up/email", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(elSetup1.betterauth ?? {}) });
		} catch (e) {
			console.error("modules.ts: sign-up", e);
		}

		const modulesDefault = jsonRead(modulesDefaultPath);
		const modules = jsonRead(modulesPath) ?? {};
		let total = 1;
		for (const elModule of children(modulesDefault))
			if (elModule?.setup === true && has(elModule, "setupPriority"))
				total++;
		const fqdn = fqdnInit(elCloud);
		await setupLoop({ i:1 }, total, elCloud, modulesDefault, modules, fqdn, true);
		jsonWrite(modules, modulesPath);
		logicSetup("Finalization", 100, true);
		buzzer(1);
	} catch (e) {
		console.error("modules.ts: modulesSetup1", e);
		inSetup = false;
		return;
	}
	if (doSetup2)
		await modulesSetup2_();
	else {
		if (has(elCloud, "info"))
			elCloud.info.setup = "done1";
		jsonWrite(elCloud, cloudPath);
		await modulesInit_(false);
		logicMessage(1, 1);
		inSetup = false;
	}
}

async function modulesSetup2_() {
	const elCloud = jsonRead(cloudPath);
	if (elCloud?.info?.setup === "done2") {
		console.log("modulesSetup2: Doing nothing");
		inSetup = false;
		return;
	}
	if (!has(elCloud, "info")) {
		console.log("modulesSetup2 not run because cloud.info is missing");
		inSetup = false;
		return;
	}
	inSetup = true;
	try {
		elCloud.info.setup = "progress2";
		jsonWrite(elCloud, cloudPath);
		const modulesDefault = jsonRead(modulesDefaultPath);
		const modules = jsonRead(modulesPath) ?? {};
		const fqdn = fqdnInit(elCloud);
		let total = 1;
		for (const elModule of children(modulesDefault))
			if (elModule?.setup === true && !has(elModule, "setupPriority"))
				total++;
		await setupLoop({ i:1 }, total, elCloud, modulesDefault, modules, fqdn, false);
		jsonWrite(modules, modulesPath);
		logicSetup("Finalization", 100, true);
		elCloud.info.setup = "done2";
		jsonWrite(elCloud, cloudPath);
		broadcast({ a:"status", progress:100, module:"_setup_", state:"finish" });
		jingle();
		logicMessage(1, 1);
	} catch (e) {
		console.error("modules.ts: modulesSetup2", e);
	}
	inSetup = false;
}

export function modulesSetup2() {
	if (inSetup) {
		console.log("modulesSetup2 not run because inSetup");
		return;
	}
	modulesSetup2_();
}
