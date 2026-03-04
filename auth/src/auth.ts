import { existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { randomBytes, X509Certificate } from "crypto";
import { WebSocket } from "ws"	;
import { betterAuth, BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware, sensitiveSessionMiddleware } from "better-auth/api";
import { username, customSession, emailOTP, magicLink, twoFactor, haveIBeenPwned, admin, jwt } from "better-auth/plugins";
import { sendMagicLinkEmail, sendVerificationEmail, sendPasswordResetVerificationEmail, sendSignInNotification, sendSignInOTP, sendVerificationEmailURL } from "./email";
import { folderAndChildren } from "./tree";
import Database from "better-sqlite3";
import "dotenv/config";
import fs from "fs";
import * as net from "net";
import * as jose from "jose";
import * as os from "os";
import * as si from "systeminformation";

export const port = 8091;
const statusDemo = process.env.PRODUCTION === "true" ? false : true;
const adminPath = (process.env.PRODUCTION === "true" ? "" : "../rootfs") + "/disk/admin/modules/";
let version = "";
try {
	readFileSync((process.env.PRODUCTION === "true" ? "" : "../rootfs") + "/usr/local/modules/_core_/version.txt", "utf-8");
} catch(e) {}
const secretPath = adminPath + "betterauth/secret.txt";
const jwkPath = adminPath + "betterauth/jwk-pub.pem";
const databasePath = adminPath + "betterauth/database.sqlite";
const cloudPath = adminPath + "_config_/_cloud_.json";
export const cloud = JSON.parse(readFileSync(cloudPath, "utf-8"));
const aiProvidersPath = (process.env.PRODUCTION === "true" ? "" : "../rootfs") + "/usr/local/modules/_core_/aiproviders.json";
const aiProviders = JSON.parse(readFileSync(aiProvidersPath, "utf-8"));
const sshKeysPath = "/disk/admin/.ssh/authorized_keys";
const modulesPath = adminPath + "_config_/_modules_.json";
const certificatePath = adminPath + "letsencrypt/fullchain.pem";
let hardware = { model:"Unknown", internalIP:"", externalIP:"", timezone:Intl.DateTimeFormat().resolvedOptions().timeZone };
if (process.env.PRODUCTION === "true")
	try {
		hardware["model"] = readFileSync( "/dev/dongle_platform/model", "utf-8").trimEnd();
	} catch (e) {}
else
	hardware["model"] = "PC";

function getInternalIp() {
	const networkInterfaces = os.networkInterfaces();
	for (const name of Object.keys(networkInterfaces)) {
		const addresses = networkInterfaces[name];
		if (addresses)
			for (const address of addresses)
				if (address.family === "IPv4" && !address.internal)
					return address.address;
	}
	return "";
}
hardware["internalIP"] = getInternalIp();

async function getExternalIp() {
	try {
		let response = await fetch("https://mydongle.cloud/master/ip.json");
		if (!response.ok)
			response = await fetch("https://api.ipify.org?format=json");
		if (response.ok) {
			const data = await response.json();
			return data["ip"];
		}
	} catch (error) {
		console.error("Cannot get external IP address", error);
	}
	return "";
}
getExternalIp().then((ip) => { hardware["externalIP"] = ip; });

let trustedOrigins;
if (process.env.PRODUCTION === "true") {
	trustedOrigins = [ "*.mydongle.cloud", "*.mondongle.cloud", "*.myd.cd" ];
	if (cloud?.domains)
		cloud.info.domains.map( domain => trustedOrigins.push(`*.${domain}`) );
	if (hardware["internalIP"] != "")
		trustedOrigins.push(hardware["internalIP"], hardware["internalIP"] + ":9400");
} else
	trustedOrigins = [ "http://localhost:8100" ];

if (!existsSync(secretPath)) {
	writeFileSync(secretPath, randomBytes(32).toString("base64"), "utf-8");
}

export const jwkInit = async () => {
	const response = await fetch("http://localhost:" + port + "/auth/jwks-pem");
	const fileContent = await response.text();
	writeFileSync(jwkPath, fileContent, "utf-8");
}

function findDomain(hostname) {
	const fqdn = hostname.replace(/^([^:]*)(?::\d+)?$/i, '$1');
	let domain;
	const parts = fqdn.split('.');
	if (parts.length <= 2 || !isNaN(Number(parts[parts.length - 1])))
		domain = fqdn;
	else {
		const sliceIndex = (parts[parts.length - 2] === "mydongle" || parts[parts.length - 2] === "mondongle" || parts[parts.length - 2] === "myd") ? -3 : -2;
		domain = parts.slice(sliceIndex).join('.');
	}
	return domain;
}

function sendToApp(data) {
	const client = new WebSocket("ws://127.0.0.1:8094");
	client.onopen = () => {
		client.send(JSON.stringify(data));
		client.close();
	};
}

si.networkStats();
let usersNb = 0;

async function aiProxy(params, request, body) {
	try {
		const { appName, subPath } = params;
		const providerName = cloud.ai.routingModules[cloud.ai.routingPerModule ? appName : "_all_"];
		request.headers.delete("content-length");
		request.headers.set("host", aiProviders[providerName].url.replace(/[^\/]*\/\//, ""));
		request.headers.set("authorization", "Bearer " + cloud.ai.keys[providerName]);
		if (providerName == "anthropic")
			request.headers.set("anthropic-version", "2023-06-01");
		if (body?.model?.startsWith("_") && body?.model?.endsWith("_"))
			body.model = aiProviders[providerName].models[body.model];
		const upstream = await fetch(aiProviders[providerName].url + "/" + subPath, {
			method: request.method,
			headers: request.headers,
			body: JSON.stringify(body)
		});
		const responseHeaders = new Headers();
		upstream.headers.forEach((value, key) => {
			if (!["connection", "content-length", "date", "content-encoding", "transfer-encoding"].includes(key.toLowerCase()))
				responseHeaders.set(key, value);
		});
		return new Response(upstream.body, { status:upstream.status, headers:responseHeaders });
	} catch (err: any) {
		return Response.json({ status: "error", detail: err.message }, { status: 502 });
	}
}

const rootPath = "/var/log/";
const endpoints = () => {
	return {
		id: "endpointsID",
		endpoints: {
			status: createAuthEndpoint("/status", {
				method: "GET",
			}, async(ctx) => {
				return Response.json({ status:"healthy", version, demo:statusDemo, timestamp:new Date().toISOString() }, { status:200 });
			}),

			settingsSave: createAuthEndpoint("/settings/save", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({ status:"error" }, { status:200 })
				let ret = false;
				try {
					const groups = execSync("id -Gn").toString();
					if (groups.split(" ").includes("sudo") != ctx.body?.security?.adminSudo)
						execSync("sudo /usr/local/modules/_core_/reset.sh -s " + (ctx.body?.security?.adminSudo ? 1 : 0));
					const cloud = JSON.parse(fs.readFileSync(cloudPath, "utf-8"));
					Object.entries(ctx.body).forEach(([key, value]) => { cloud[key] = value; });
					writeFileSync(cloudPath, JSON.stringify(cloud, null, "\t"), "utf-8");
					ret = true;
				} catch (error) {}
				if (ctx.body?.security?.sshKeys !== "")
					writeFileSync(sshKeysPath, ctx.body?.security?.sshKeys, "utf-8");
				if (ctx.body?.timezone !== hardware.timezone)
					execSync("sudo /usr/local/modules/_core_/reset.sh -t \"" + (ctx.body.timezone) + "\"");
				return Response.json({ status:(ret ? "success" : "error") }, { status:200 });
			}),

			settingsWiFiGet: createAuthEndpoint("/settings/wifi", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({ status:"error" }, { status:200 });
				let device, ssid, pwd;
				const ret1 = execSync("nmcli -t -f NAME,DEVICE connection show | grep wlan0");
				[ssid, device] = ret1.toString().trim().split(":");
				pwd = execSync("nmcli -s -g 802-11-wireless-security.psk connection show \"" + ssid + "\"").toString();
				return Response.json({ device, ssid, pwd }, { status:200 });
			}),

			settingsWiFiApply: createAuthEndpoint("/settings/wifi-apply", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({ status:"error" }, { status:200 })
				sendToApp({ a:"wifi", wifi:ctx.body?.wifi });
				return Response.json({ status:"success" }, { status:200 });
			}),

			settingsSshKeys: createAuthEndpoint("/settings/sshkeys", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return new Response("", { status:500 });
				return new Response(fs.readFileSync(sshKeysPath, "utf8"), { status:200 });
			}),

			settingsCertificateInfo: createAuthEndpoint("/settings/certificate-info", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({ status:"error" }, { status:200 });
				const certData = fs.readFileSync(certificatePath);
				const cert = new X509Certificate(certData);
				return Response.json({
					"status":"success",
					"date": cert.validToDate,
					"dateString": cert.validTo,
					"domains": cert.subjectAltName ? cert.subjectAltName.split(", ").map(d => d.replace(/^DNS:/, "")) : []
				}, { status:200, headers:{ "Cache-Control":"no-store, no-cache, must-revalidate" } });
			}),

			settingsCertificateRenew: createAuthEndpoint("/settings/certificate-save", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({ status:"error" }, { status:200 });
				return Response.json({ "status":"success" }, { status:200, headers:{ "Cache-Control":"no-store, no-cache, must-revalidate" } });
			}),

			hardware: createAuthEndpoint("/hardware", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				hardware["internalIP"] = getInternalIp();
				hardware["externalIP"] = await getExternalIp();
				return Response.json(hardware, { status:200, headers:{ "Cache-Control":"no-store, no-cache, must-revalidate" } });
			}),

			refresh: createAuthEndpoint("/refresh", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				sendToApp({ a:"refresh-webserver" });
				return Response.json({ "status":"success" }, { status:200, headers:{ "Cache-Control":"no-store, no-cache, must-revalidate" } });
			}),

			settingsUserSave: createAuthEndpoint("/settings-user/save", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				ctx?.context.options.database.prepare("UPDATE user SET settings = ? WHERE id = ?").run(JSON.stringify(ctx.body), ctx.context.session.user.id);
				return Response.json({ "status":"success" }, { status:200 });
			}),

			settingsAiSave: createAuthEndpoint("/settings-ai/save", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				return Response.json({ "status":"success" }, { status:200 });
			}),

			aiPost: createAuthEndpoint("/ai/:appName/**:subPath", {
				method: "POST",
				useOriginalRequest: true,
			}, async(ctx) => {
				return await aiProxy(ctx.params, ctx?.request, ctx?.body);
			}),

			aiGet: createAuthEndpoint("/ai/:appName/**:subPath", {
				method: "GET",
				useOriginalRequest: true,
			}, async(ctx) => {
				return await aiProxy(ctx.params, ctx?.request, ctx?.body);
			}),

			stats: createAuthEndpoint("/stats", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				const ret = {};
				if (usersNb == 0) {
					const countStatement = ctx?.context.options.database.prepare("SELECT COUNT(*) AS count FROM user");
					const result = countStatement.get();
					usersNb = result?.count;
				}
				ret["users"] = { count: usersNb };
				const dataLoad = await si.currentLoad();
				ret["cpu"] = {
					current: {
						user: parseFloat(dataLoad.currentLoadUser.toFixed(2)), //%
						system: parseFloat(dataLoad.currentLoadSystem.toFixed(2)), //%
						usersystem: parseFloat((dataLoad.currentLoadUser + dataLoad.currentLoadSystem).toFixed(2)), //%
						idle: parseFloat(dataLoad.currentLoadIdle.toFixed(2)) //%
					},
					average: parseFloat(dataLoad.avgLoad.toFixed(2)) //%
				};
				const dataMem = await si.mem();
				ret["mem"] = {
					total: (dataMem.total / (1000 * 1000)).toFixed(0), //MB
					used: (dataMem.active / (1000 * 1000)).toFixed(0), //MB
					available: (dataMem.available / (1000 * 1000)).toFixed(0), //MB
					swap: {
						total: (dataMem.swaptotal / (1000 * 1000)).toFixed(0), //MB
						used: (dataMem.swapused / (1000 * 1000)).toFixed(0), //MB
						available: (dataMem.swapfree / (1000 * 1000)).toFixed(0) //MB
					}
				};
				const dataStorage_ = await si.fsSize();
				const dataStorage = dataStorage_.find(fs => fs.mount === "/");
				if (dataStorage)
					ret["storage"] = {
						usage: parseFloat(dataStorage.use.toFixed(2)), //%
						size: parseFloat((dataStorage.size / (1000 * 1000)).toFixed(0)), //MB
						used: parseFloat((dataStorage.used / (1000 * 1000)).toFixed(0)), //MB
						available: parseFloat((dataStorage.available / (1000 * 1000)).toFixed(0)) //MB
					};
				const dataNetwork_ = await si.networkStats();
				let dataNetwork;
				dataNetwork = dataNetwork_.find(nw => nw.iface === "wlan0");
				if (!dataNetwork)
					dataNetwork = dataNetwork_.find(nw => nw.iface === "eth0");
				if (!dataNetwork)
					dataNetwork = dataNetwork_.find(nw => nw.iface === "wlo1");
				if (dataNetwork)
					ret["network"] = {
						total: {
							rx: dataNetwork.rx_bytes ?? 0, //B
							tx: dataNetwork.tx_bytes ?? 0 //B
						},
						current: {
							rx: dataNetwork.rx_sec ?? 0, //B
							tx: dataNetwork.tx_sec ?? 0, //B
						}
					};
				return Response.json(ret, { status:200, headers:{ "Cache-Control":"no-store, no-cache, must-revalidate" } });
			}),

			serverLog: createAuthEndpoint("/server-log", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({}, { status:200 });
				let path = ctx.body?.path;
				path = path.replace(/\/\/+/g, "/");
				while (path.includes("/../"))
					path = path.replace(/\/[^/]+\/\.\.\//g, "/");
				path = path.replace(/^\/\.\.\/|\/\.\.\/?$/, "");
				const fullPath = rootPath + path;
				const stats = fs.statSync(fullPath);
				if (stats.isDirectory())
					return Response.json(folderAndChildren(fullPath), { status:200 });
				else
					return new Response(fs.readFileSync(fullPath, "utf8"), { status:200 });
			}),

			modulesData: createAuthEndpoint("/modules/data", {
				method: "GET",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				return new Response(fs.readFileSync(modulesPath, "utf-8"), { status:200, headers:{ "Cache-Control":"no-store, no-cache, must-revalidate" } });
			}),

			modulesPermissions: createAuthEndpoint("/module/permissions", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				let ret;
				try {
					const modules = JSON.parse(fs.readFileSync(modulesPath, "utf-8"));
					Object.entries(ctx.body).forEach(([key, value]) => {
						if (!modules[key])
							modules[key] = {};
						if (value?.["enabled"] === false) {
							modules[key].enabled = false;
							delete modules[key].permissions;
						} else if (value?.["permissions"]) {
							delete modules[key].enabled;
							if (!modules[key])
								modules[key] = {};
							modules[key].permissions = value["permissions"];
						}
					});
					writeFileSync(modulesPath, JSON.stringify(modules, null, "\t"), "utf-8");
					ret = { status:"success" };
				} catch (error) {
					ret = { status:"error" };
				}
				return Response.json(ret, { status:200 });
			}),

			moduleRefresh: createAuthEndpoint("/module/refresh", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({ status:"error" }, { status:200 });
				if (process.env.PRODUCTION === "true")
					ctx.body?.services?.forEach((value) => { execSync("systemctl restart " + value); });
				return Response.json({ status:"success" }, { status:200 });
			}),

			moduleReset: createAuthEndpoint("/module/reset", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				if (ctx.context.session?.user?.role != "admin")
					return Response.json({ status:"error" }, { status:200 });
				const tbe = "sudo /usr/local/modules/_core_/reset.sh " + ctx.body?.module;
				let ret = false;
				let output;
				try {
					output = execSync(tbe);
					ret = true;
				} catch (e) {}
				return Response.json({ status:ret ? "success" : "error", log:output.toString() }, { status:200 });
			}),

			moduleConfig: createAuthEndpoint("/module/config", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				let ret;
				try {
					ret = JSON.parse(fs.readFileSync("/disk/admin/modules/_config_/" + ctx.body?.module + ".json", "utf8"));
				} catch (e) {
					ret = { status:"error" };
				}
				return Response.json(ret, { status:200 });
			}),

			moduleStats: createAuthEndpoint("/module/stats", {
				method: "POST",
				use: [sensitiveSessionMiddleware]
			}, async(ctx) => {
				let ret = {};
				try {
					if (ctx.body?.all) {
						const files = fs.readdirSync("/var/log/apache2/");
						const matchingFiles = files.filter(file => /^stats-.*\.json$/.test(file));
						for (const file of matchingFiles)
							ret[file.replace("stats-", "").replace(".json", "")] = JSON.parse(fs.readFileSync("/var/log/apache2/" + file, "utf8"));
					} else
						ret = JSON.parse(fs.readFileSync("/var/log/apache2/stats-" + ctx.body?.module + ".json", "utf8"));
				} catch (e) {
					ret = { status:"error" };
				}
				return Response.json(ret, { status:200 });
			}),

			jwksPem: createAuthEndpoint("/jwks-pem", {
				method: "GET",
			}, async(ctx) => {
				const jwksRes = await fetch("http://localhost:" + port + "/auth/jwks");
				const jwks = await jwksRes.json();
				const key = await jose.importJWK(jwks.keys[0], "ES256") as jose.KeyObject;
				const pem = await jose.exportSPKI(key);
				return new Response(pem, { status:200 });
			})
		}
	} satisfies BetterAuthPlugin
}

export const auth = betterAuth({
	secret: readFileSync(secretPath, "utf-8").trim(),
	baseURL: "http://localhost:" + port + "/auth",
	database: new Database(databasePath),
	emailAndPassword: { enabled:true, autoSignIn:false },
	advanced: { disableOriginCheck: process.env.PRODUCTION !== "true" },
	user: {
		deleteUser: {
			enabled: true,
			beforeDelete: async (user, request) => {
				if (user["username"] == cloud.info.name)
					throw new APIError("BAD_REQUEST", { message:"First account (username is the cloud name) can't be deleted" });
			}
		},
		additionalFields: {
			approved: {
				type: "boolean",
				required: true,
				defaultValue: false,
				input: false
			},
			settings: {
				type: "string",
				required: true,
				defaultValue: JSON.stringify({ lang:"en", powerUser:false, tags:[], dontShowAgain:{}, welcomeTourShown:false }),
			}
		}
	},
	plugins: [
		username(),
		customSession(async ({ user, session }) => {
			return { session, user, hardware, cloud };
		}),
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				sendToApp({ a:"passcode", v:parseInt(otp) });
				if (type === "email-verification") {
					sendVerificationEmail(email, otp);
				} else if (type === "sign-in") {
					sendSignInOTP(email, otp);
				} else if (type === "forget-password") {
					sendPasswordResetVerificationEmail(email, otp);
				}
			},
		}),
		magicLink({
			async sendMagicLink({ email, token, url }) {
				await sendMagicLinkEmail(email, token, url);
			},
		}),
		twoFactor({
			skipVerificationOnEnable:true,
			otpOptions: {
				async sendOTP({ user, otp }, request) {
					sendToApp({ a:"otp", v:parseInt(otp), e:user?.["email"] });
					sendSignInOTP(user?.["email"], otp);
				}
			}
		}),
		//haveIBeenPwned({ customPasswordCompromisedMessage:"Please choose a more secure password." }),
		admin(),
		jwt({
			jwt: {
				expirationTime: "1w",
				definePayload: ({ user }) => {
					return {
						role: user["role"],
						username: user["username"],
						cloudname: cloud["name"],
						user
					};
				}
			},
			jwks: { keyPairConfig:{ alg:"ES256" } }
		}),
		endpoints()
	],
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			if (cloud?.security?.newUserNeedsApproval === true && (ctx.path == "/sign-in/email" || ctx.path == "/sign-in/username")) {
				const identifier = ctx.body?.email || ctx.body?.username;
				console.log("Attempting login for: " + identifier);
				const userDb = await ctx.context.adapter.findOne({
					model: "user",
					where: [ { field:ctx.path === "/sign-in/email" ? "email" : "username", value:identifier } ]
				});
				if (userDb && !userDb["approved"]) {
					console.log(identifier + " is pending admin approval.");
					throw new APIError("UNAUTHORIZED", { message: "Your account is pending admin approval." });
				}
			}
			if (ctx.path == "/admin/update-user") {
				const userDb = await ctx.context.adapter.findOne({
					model: "user",
					where: [ { field:"id", value:ctx.body?.userId } ]
				});
				if (userDb && userDb?.["username"] == cloud.info.name)
					throw new APIError("UNAUTHORIZED", { message: "Can't change super admin." });
			}
		}),
		after: createAuthMiddleware(async (ctx) => {
/*
			console.log("###########################");
			const responseBody = ctx.context.returned;
			let logBody;
			if (responseBody instanceof Response) {
				const status = responseBody.status || 200;
				const bodyText = await responseBody.text();
				logBody = bodyText.startsWith("{") || bodyText.startsWith("[") ? JSON.stringify(JSON.parse(bodyText), null, 2) : bodyText;
				console.log(`${status} for ${ctx.method} ${ctx.path}:\n`, logBody);
			} else {
				logBody = typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody, null, 2);
				console.log(`200 for ${ctx.method} ${ctx.path}:\n`, logBody);
			}
			console.log("###########################");
*/
			if (ctx.path == "/two-factor/verify-otp" && ctx.context.returned?.["statusCode"] === undefined)
				sendToApp({ a:"otp", v:0 });
			if (ctx.path == "/sign-in/email" || ctx.path == "/sign-in/username" || ctx.path == "/two-factor/verify-otp" || ctx.path == "/two-factor/verify-totp") {
				if (statusDemo)
					console.log("Sign-in for " + ctx.context.returned?.["user"]?.email + ", " + ctx.context.returned?.["user"]?.username);
				else {
					if (cloud?.security?.signInNotification === true && ctx.context.returned?.["user"]?.email !== "")
						sendSignInNotification(ctx.context.returned?.["user"]?.email);
				}
				const domain = findDomain(ctx.request?.headers.get("host") || "");
				const currentCookie = ctx?.context?.responseHeaders?.get("set-cookie");
				if (currentCookie)
					ctx?.context?.responseHeaders?.set("set-cookie", currentCookie + "; Domain=" + domain);
			}
			if (ctx.path == "/token" && ctx.context.returned?.["token"]) {
				const domain = findDomain(ctx.request?.headers.get("host") || "");
				ctx.setCookie("jwt", ctx.context.returned["token"], {
					httpOnly: true,
					domain,
					path: "/"
				});
				ctx.context.returned["token"] = "";
			}
			if (ctx.path == "/revoke-session") {
				if (statusDemo)
					console.log("Sign-out");
				else {
					const domain = findDomain(ctx.request?.headers.get("host") || "");
					ctx.setCookie("jwt", "", { httpOnly: true, domain, path: "/", expires: new Date(0), maxAge: 0 });
				}
			}
			if (ctx.path == "/sign-up/email") {
				if (statusDemo)
					console.log("Sign-up for " + ctx.context.returned?.["user"]?.email + ", " + ctx.context.returned?.["user"]?.username);
				else {
					if (cloud?.security?.signInNotification === true && ctx.context.returned?.["user"]?.email !== "")
						sendSignInNotification(ctx.context.returned?.["user"]?.email);
				}
			}
		})
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user, ctx) => {
					const countStatement = ctx?.context.options.database.prepare("SELECT COUNT(*) AS count FROM user");
					const result = countStatement.get();
					if (result?.count == 0) {
						const cloudF = JSON.parse(readFileSync(cloudPath, "utf-8"));
						if (Object.keys(cloudF).length === 0) {
							console.log("PROBLEM: Creating first user but _cloud_.json is empty");
						}
						user.username = cloudF.info.name;
						user.approved = true;
						user.role = "admin";
					} else {
						if (user.username === undefined)
							user.username = "user-" + Math.floor(Math.random() * 99999);
					}
					return { data: { ...user } };
				}
			}
		}
	},
	trustedOrigins: trustedOrigins
});

export const handler = auth.handler;
