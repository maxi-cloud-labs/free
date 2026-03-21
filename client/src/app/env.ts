import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { NavController, AlertController, MenuController } from '@ionic/angular';
import { PopoverController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { InAppReview } from '@capacitor-community/in-app-review';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { environment } from '../environments/environment';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Settings, CategoriesEx } from './myinterface';
import { VERSION } from './version';

declare var appConnectToggle: any;
declare var appDeveloper;

@Injectable({
	providedIn: "root"
})

export class Global implements CanActivate {
modulesDefault;
modulesMeta;
developer: boolean = false;
demo: boolean = false;
splashDone = false;
VERSION: string = VERSION;
SERVERURL: string = "https://maxi.cloud";
activateUrl: string;
settings: Settings = { lang:"en", powerUser:false, tags:[], dontShowAgain:[], welcomeTourShown:false } as Settings;
refreshUI:Subject<any> = new Subject();
toast:Subject<any> = new Subject();
session;
modulesData = [];
sidebarFilterType = "";
sidebarSearchTerm = "";
statsIntervalId;
statsPeriod;
statsData;
themeSel = "system";
darkVal = false;
setupUIProgress = 0;
setupUIDesc = "";

constructor(public plt: Platform, private router: Router, private navCtrl: NavController, private alertCtrl: AlertController, private menu: MenuController, private translate: TranslateService, public popoverController: PopoverController, private httpClient: HttpClient) {
	if (!this.splashDone) {
		const params = new URLSearchParams(window.location.search);
		if (params.get("dev") != null)
			this.developerSet(true);
	}
	this.httpClient.get("assets/modulesmeta.json").toPromise().then(data => { this.modulesMeta = data; });
	this.httpClient.get("assets/modulesdefault.json").toPromise().then(data => { this.modulesDefault = data; });
	this.developer = this.developerGet();
	appDeveloper = this.developer;
	this.consolelog(0, "%c⛅ mAxI.cloud: my Data, my AI, my Sovereignty 🚀", "font-weight:bold; font-size:x-large;");
	this.consolelog(0, "%cDocs: https://docs.maxi.cloud", "font-weight:bold; font-size:large;");
	this.consolelog(0, "%cVersion: " + this.VERSION, "background-color:#646464; border-radius:5px; padding:5px;");
	this.consolelog(0, "%cPlease give a ⭐ to this project at:", "color:black; background-color:#fef9c2; border-radius:5px; padding:5px;");
	this.consolelog(0, "%chttps://github.com/maxi-cloud-labs/free", "border:1px solid white; border-radius:5px; padding:5px; font-weight:bold;");
	this.consolelog(1, "Platform: " + this.plt.platforms());
	navCtrl.setDirection("forward");
	translate.setDefaultLang("en");
	this.consolelog(1, "Default browser language: " + translate.getBrowserLang());
	if (window.location.hostname.indexOf("mondongle.cloud") != -1)
		this.changeLanguage("fr");
	else
		this.changeLanguage(this.translate.getBrowserLang());
	this.AuthStatus();
	this.getSession();
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { this.themeSet(); });
	this.themeSet();
	this.getVisitorHash();
}

consolelog(level, ...st) {
	if (level == 0 || this.developer)
		console.log(...st);
}

themeSet(t = null) {
	if (t !== null)
		this.themeSel = t;
	if (this.themeSel == "system")
		this.darkVal = window.matchMedia("(prefers-color-scheme: dark)").matches;
	else if (this.themeSel == "dark")
		this.darkVal = true;
	else
		this.darkVal = false;
	const darkCurrent = document.body.classList.contains("dark");
	if (darkCurrent == false && this.darkVal == true)
		document.body.classList.add("dark");
	if (darkCurrent == true && this.darkVal == false)
		document.body.classList.remove("dark");
}

async getVisitorHash() {
	const fp = await FingerprintJS.load();
	const result = await fp.get();
	const visitorId = result.visitorId;
	this.consolelog(1, "Fingerprint: " + visitorId);
	return visitorId;
}

getCookie(name) {
	const allCookies = document.cookie;
	const nameEQ = name + "=";
	const ca = document.cookie.split(';');
	for(let i=0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0)
			return decodeURIComponent(c.substring(nameEQ.length, c.length));
	}
	return null;
}

async getExternalIP() {
	try {
		let response = await fetch("https://maxi.cloud/master/ip.json");
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

async AuthStatus() {
	const ret = await this.httpClient.get("/_app_/auth/status", {headers:{"content-type": "application/json"}}).toPromise();
	if (ret["demo"] === true)
		this.demo = true;
	this.consolelog(2, "Auth Status: ", ret);
}

developerSet(a = null) {
	if (a === null)
		this.developer = !this.developer;
	else
		this.developer = a;
	sessionStorage.setItem("developer", String(this.developer));
}

developerGet() {
	if (sessionStorage.getItem("developer") === null) {
		const val = window.location.hostname == "localhost" && window.location.port == "8100";
		sessionStorage.setItem("developer", String(val));
		return val;
	} else
		return sessionStorage.getItem("developer") === "true";
}

async getSession() {
	this.session = await this.httpClient.get("/_app_/auth/get-session", {headers:{"content-type": "application/json"}}).toPromise();
	this.consolelog(2, "Auth get-session: ", this.session);
	if (this.session != null) {
		const jwt = await this.httpClient.get("/_app_/auth/token", {headers:{"content-type": "application/json"}}).toPromise();
		this.settings = JSON.parse(this.session.user.settings);
		await this.translate.use(this.settings.lang);
		await this.modulesDataPrepare();
		this.statsPeriod = this.developer ? 5 : this.session.user.role == "admin" ? 15 : 30;
		this.statsStartPolling();
		if ((!this.demo || this.developer) && this.session.user.role == "admin")
			appConnectToggle(true);
	}
}

async logout() {
	const data = { token:this.session?.session?.token };
	try {
		const ret = await this.httpClient.post("/_app_/auth/revoke-session", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.consolelog(2, "Auth revoke-session: ", ret);
	} catch(e) {}
	this.session = null;
}

async logoutRedirect() {
	await this.logout();
	this.consolelog(1, "logout");
	document.location.href = "/";
}

async settingsSave() {
	try {
		const ret = await this.httpClient.post("/_app_/auth/profile/save", JSON.stringify(this.settings), {headers:{"content-type": "application/json"}}).toPromise();
		this.consolelog(2, "Auth settings-user/save: ", ret);
	} catch(e) {}
}

async backButtonAlert() {
	const alert = await this.alertCtrl.create({
		message: this.mytranslateP("splash", "Do you want to leave this application?"),
		buttons: [{
			text: "cancel",
			role: "cancel"
		},{
			text: "Close App",
			handler: () => {
				App.exitApp();
			}
		}]
	});
	await alert.present();
}

async presentQuestion(hd, st, msg, key:string = "") {
	if (key != "" && this.settings.dontShowAgain.includes(key))
		return false;
	let checked = false;
	let yesClicked = false;
	const question = await this.alertCtrl.create({
		cssClass: "white-space-pre-wrap",
		header: hd,
		subHeader: st,
		message: msg,
		buttons: [{
			text: "Yes", handler: (data) => { yesClicked = true; if (data !== undefined && data.length > 0 && data[0]) checked = true; }
		}, {
			text: "No", cssClass: "secondary", handler: (data) => { yesClicked = false; if (data !== undefined && data.length > 0 && data[0]) checked = true; }
		}],
		inputs: key != "" ? [{ label:"Don't show again", type:"checkbox", checked:false, value:true }] : []
	});
	await question.present();
	await question.onDidDismiss();
	if (checked) {
		this.settings.dontShowAgain.push(key);
		this.settingsSave();
	}
	return yesClicked;
}

async changeLanguage(st) {
	if (st != this.settings.lang) {
		this.settings.lang = st;
		await this.translate.use(this.settings.lang);
		this.settingsSave();
	}
}

mytranslateP(page, st) {
	const inp = page + "." + st;
	const ret = this.translate.instant(page + "." + st);
	return ret == "" ? (this.developer && this.settings.lang != "en" ? ("##" + st + "##") : st) : ret == inp ? (this.developer ? ("##" + st + "##") : st) : ret;
}

mytranslate(st) {
	return this.mytranslateP(this.router.url.replace(/^\/|(\?).*$/g, ""), st);
}

mytranslateG(st) {
	return this.mytranslateP("global", st);
}

mytranslateK(st) {
	return this.mytranslateP("keywords", st);
}

mytranslateMT(st) {
	return this.mytranslateP("modules.title", st);
}

mytranslateMD(st) {
	return this.mytranslateP("modules.description", st);
}

async sleepms(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

openHome() {
	if (this.router.url == "/")
		this.refreshUI.next("reset");
}

openModuleHref(identifier:number|string) {
	let id = identifier;
	if (typeof identifier == "string")
		id = this.modulesDataFindId(identifier);
	if (!this.modulesData[id]?.web)
		return null;
	const subdomain = this.modulesData[id].alias[0] ?? this.modulesData[id].module;
	const page_ = this.modulesData[id].homepage ?? "";
	if (this.demo)
		return "/wrapper?module=" + this.modulesData[id].module + "&subdomain=" + subdomain + "&page=" + page_;
	else
		return location.protocol + "//" + location.host + "/m/" + subdomain + page_;
}

openModuleTarget(identifier:number|string) {
	let id = identifier;
	if (typeof identifier == "string")
		id = this.modulesDataFindId(identifier);
	if (this.demo || !this.modulesData[id]?.web)
		return "_self";
	else
		return "_blank";		
}

async openModuleClick(event, identifier:number|string, t = null) {
	let id = identifier;
	if (typeof identifier == "string")
		id = this.modulesDataFindId(identifier);
	if (!this.modulesData[id].web) {
		event.preventDefault();
		if (t)
			t.info(this.modulesData[id].module);
		return;
	}
	if (this.demo) {
		event.preventDefault();
		const subdomain = this.modulesData[id].alias[0] ?? this.modulesData[id].module;
		const page_ = this.modulesData[id].homepage ?? "";
		this.router.navigate(["/wrapper"], { queryParams: {
			module: this.modulesData[id].module,
			subdomain,
			page: page_
		} });
	} else {
		if (this.modulesData[id].notReady != 0) {
			event.preventDefault();
			if (this.session.cloud.info.setup.startsWith("progress"))
				this.presentToast("The setup of this module is under progress. It should be ready shortly...", "close-outline", 5000);
			else if (this.session.cloud.info.setup == "done1") {
				if (this.modulesData[id].notReady == 3)
					this.presentToast("The module is being set up. Please wait...", "alert-circle-outline");
				else if (await (this.presentQuestion("First-time setup", "Do you want to setup this module now?", "You will be notified when the module is ready."))) {
					this.presentToast("The module setup has started. You will be notified of completion.", "alert-circle-outline");
					this.modulesData[id].notReady = 3;
					this.refreshUI.next("refresh");
					const data = { module:this.modulesData[id].module };
					this.httpClient.post("/_app_/auth/module/reset", JSON.stringify(data), { headers:{ "content-type": "application/json" } }).toPromise().then(ret => { this.consolelog(2, "Auth module-reset: ", ret); });
				}
			}
		}
	}
}

async presentAlert(hd, st, msg, key:string = "") {
	let checked = false;
	if (this.settings.dontShowAgain.includes(key) !== undefined)
		return;
	const alert = await this.alertCtrl.create({
		cssClass: "basic-alert",
		header: hd,
		subHeader: st,
		message: msg,
		buttons: [{ text:"OK", handler: data => { if (data !== undefined && data.length > 0 && data[0]) checked = true; } }],
		inputs: key != "" ? [{label:"Don't show again", type:"checkbox", checked:false, value:true}] : []
	});
	await alert.present();
	await alert.onDidDismiss();
	if (checked) {
		this.settings.dontShowAgain.push(key);
		this.settingsSave();
	}
}

dismissToast() {
	this.toast.next({ show:false });
}

presentToast(message, icon, delay = 3000) {
	this.toast.next({ show:true, message, icon, delay });
}

async platform() {
	if (this.plt.is("ios") && this.plt.is("cordova"))
		return "ios";
	else if (this.plt.is("android") && this.plt.is("cordova"))
		return "android";
	else
		return "web";
}

isPlatform(a) {
	if (a == "androidios")
		return (this.plt.is("android") || this.plt.is("ios")) && this.plt.is("cordova");
	else if (a == "android")
		return this.plt.is("android") && this.plt.is("cordova");
	else if (a == "ios")
		return this.plt.is("ios") && this.plt.is("cordova");
	else if (a == "web")
		return !((this.plt.is("android") && this.plt.is("cordova")) || (this.plt.is("ios") && this.plt.is("cordova")));
	else
		return false;
}

getMonth(a) {
	if (typeof a == "undefined")
		return "";
	else if (a.indexOf("01.01") != -1 || a.indexOf("01-01") != -1)
		return "January";
	else if (a.indexOf("02.02") != -1 || a.indexOf("02-02") != -1)
		return "February";
	else if (a.indexOf("03.03") != -1 || a.indexOf("03-03") != -1)
		return "March";
	else if (a.indexOf("04.04") != -1 || a.indexOf("04-04") != -1)
		return "April";
	else if (a.indexOf("05.05") != -1 || a.indexOf("05-05") != -1)
		return "May";
	else if (a.indexOf("06.06") != -1 || a.indexOf("06-06") != -1)
		return "June";
	else if (a.indexOf("07.07") != -1 || a.indexOf("07-07") != -1)
		return "July";
	else if (a.indexOf("08.08") != -1 || a.indexOf("08-08") != -1)
		return "August";
	else if (a.indexOf("09.09") != -1 || a.indexOf("09-09") != -1)
		return "September";
	else if (a.indexOf("10.10") != -1 || a.indexOf("10-10") != -1)
		return "October";
	else if (a.indexOf("11.11") != -1 || a.indexOf("11-11") != -1)
		return "November";
	else if (a.indexOf("12.12") != -1 || a.indexOf("12-12") != -1)
		return "December";
	return "";
}

permissions(st) {
	if (st == "public")
		return "Public";
	else if (st == "local")
		return "Local Network";
	else if (st == "hardware")
		return "Hardware";
	else if (st == "admin")
		return "Admin";
	else if (st == "user")
		return "User";
	else
		return null;
}

colorWord(st, bckgd = true) {
	if (st == "disabled")
		return (bckgd ? "bg--red-100 " : "") + "text--red-800";

	if (st == "public")
		return (bckgd ? "bg--green-100 " : "") + "text--green-800";
	if (st == "local")
		return (bckgd ? "bg--yellow-100 " : "") + "text--yellow-800";
	if (st == "admin")
		return (bckgd ? "bg--yellow-100 " : "") + "text--yellow-800";
	if (st == "user")
		return (bckgd ? "bg--purple-100 " : "") + "text--purple-800";

	if (CategoriesEx[st])
		return (bckgd ? "bg--" + CategoriesEx[st].color + "-100 " : "") + "text--" + CategoriesEx[st].color + "-600";
/*
bg--yellow-100 text--yellow-600
bg--purple-100 text--purple-600
bg--blue-100 text--blue-600
bg--cyan-100 text--cyan-600
bg--orange-100 text--orange-600
*/
	return (bckgd ? "bg--gray-100 " : "") + "text--gray-600";
}
 

colorWord2(st) {
	if (CategoriesEx[st])
		return "translate-y-[-256px] drop-shadow-[0px_256px_0_var(--color--" + CategoriesEx[st].color + "-600)]";
/*
translate-y-[-256px] drop-shadow-[0px_256px_0_var(--color--yellow-600)]
translate-y-[-256px] drop-shadow-[0px_256px_0_var(--color--purple-600)]
translate-y-[-256px] drop-shadow-[0px_256px_0_var(--color--blue-600)]
translate-y-[-256px] drop-shadow-[0px_256px_0_var(--color--cyan-600)]
translate-y-[-256px] drop-shadow-[0px_256px_0_var(--color--orange-600)]
*/
	return "translate-y-[-256px] drop-shadow-[0px_256px_0_var(--color--gray-600)]";
}

colorPercent(p, limits = [ 80, 50 ]) {
	if (p >= limits[0])
		return "bg--red-400";
	else if (p >= limits[1])
		return "bg--yellow-400";
	else
		return "bg--green-400";
}

formatCount(count) {
	if (count >= 1_000_000) {
		const rounded = (count / 1_000_000).toFixed(2);
		return rounded + "M";
	} else if (count >= 1000) {
		const rounded = (count / 1000).toFixed(1);
		return rounded + "k";
	} else
		return "" + count;
}

async modulesDataPrepare() {
	const modules = await this.httpClient.get("/_app_/auth/modules/data").toPromise();
	this.modulesData.length = 0;
	Object.entries(this.modulesMeta).forEach(([key, value]) => {
		if (this.modulesDefault[key] === undefined)
			this.consolelog(1, "Error: " + key + " not in modulesdefault");
		else if ((this.modulesDefault[key]["web"] === true && this.modulesMeta[key]["web"] !== true) || (this.modulesDefault[key]["web"] !== true && this.modulesMeta[key]["web"] === true))
			this.consolelog(1, "Error: " + key + " discrepancy web flag");
	});
	Object.entries(this.modulesDefault).forEach(([key, value]) => {
		if (this.modulesMeta[key] === undefined) {
			this.consolelog(1, "Error: " + key + " not in modulesmeta");
			return;
		}
		if (value["reservedToFirstUser"] === true && this.session.user.username != this.session.cloud.info.name)
			return;
		if (this.session.user.role == "user" && !value["web"])
			return;
		value["enabled"] = modules[key]?.enabled ?? value["enabled"] ?? true;
		value["notReady"] = modules[key]?.["setupDone"] !== true && value["setup"] === true && !this.demo ? 2 : 0;
		if (this.demo)
			this.modulesMeta[key]["finished"] = true;
		value["permissions"] = modules[key]?.permissions ?? value["permissions"];
		if (this.session.user.role == "user" && !(value["permissions"].includes("public") || value["permissions"].includes("user")))
			return;
		if (value["web"] !== true) {
			value["permissions"] = ["admin"];
			value["web"] = false;
			value["enabled"] = true;
		}
		value["alias"] = [...(value["alias"] ?? []), ...(modules[key]?.alias ?? [])];
		if (value["web"]) {
			const ll = value["alias"].length > 0 ? value["alias"][0] : key;
			value["link"] = location.protocol + "//" + location.host + "/m/" + ll;
			value["link2"] = "https://" + ll + "." + (this.session?.["cloud"]?.["info"]?.["name"] ?? "") + ".maxi.cloud";
			value["link"] = value["link"].toLowerCase();
			if (value["homepage"])
				value["link"] += value["homepage"];
			value["link2"] = value["link2"].toLowerCase();
		}
		Object.entries(this.modulesMeta[key]).forEach(([key2, value2]) => {
			value[key2] = value2;
		});
		value["tag"] = this.settings.tags.includes(key) ?? false;
		const items = [
			value["module"],
			value["name"],
			value["title"],
			value["category"],
			...value["keywords"],
			...value["proprietary"],
			...value["alias"],
		].filter(item => item !== "").map(v => v.toLowerCase());
		value["hayStack"] = [...new Set(items)];
		this.modulesData.push(value);
	});
	this.refreshUI.next("modules");
	if (this.session.user.role == "admin" && this.session.cloud.info.setup.startsWith("progress"))
		this.setup2Start(false);
}

async setup2Start(start) {
	if (start) {
		const ret = await this.httpClient.get("/_app_/auth/modules/setup2", {headers:{"content-type": "application/json"}}).toPromise();
		this.consolelog(2, "Auth setup2: ", ret);
		this.session.cloud.info.setup = "progress2";
	}
	appConnectToggle(true);
	this.presentToast("First-time setup is under progress...", "help-outline");
	this.setupUIDesc = "initialization";
	this.setupUIProgress = 1;
	this.refreshUI.next("refresh");
}

modulesDataFindId(m) {
	let ret = 0;
	this.modulesData.forEach((data, index) => {
		if (data["module"] == m)
			ret = index;
	});
	return ret;
}

async statusRefresh(data) {
	if (!this.modulesData.length)
		return;
	if (data.progress)
		this.setupUIProgress = data.progress;
	if (data.module === "_setup_" && data.state === "finish") {
		this.setupUIProgress = 0;
		this.setupUIDesc = "";
		this.modulesData.forEach((data) => { data["notReady"] = 0; });
		this.presentToast("First-time setup is now complete!", "help-outline", 0);
	} else if (data.module && data.state === "start") {
		this.setupUIDesc = "module: " + data.module;
		this.modulesData[this.modulesDataFindId(data.module)]["notReady"] = 1;
	} else if (data.module && data.state === "finish") {
		this.modulesData[this.modulesDataFindId(data.module)]["notReady"] = 0;
		if (!this.session.cloud.info.setup.startsWith("progress"))
			this.presentToast("The module " + data.module + " is now ready.", "close-outline", 5000);
	}
	this.refreshUI.next("refresh");
}

async statsPolling() {
	this.statsData = await this.httpClient.get("/_app_/auth/stats", {headers:{"content-type": "application/json"}}).toPromise();
	this.refreshUI.next("onlySidebar");
}

statsPeriodChange(incDir) {
	if (incDir > 0) {
		if (this.statsPeriod >= 10)
			this.statsPeriod = 30;
		else if (this.statsPeriod >= 5)
			this.statsPeriod = 10;
		else if (this.statsPeriod >= 1)
			this.statsPeriod = 5;
		else
			this.statsPeriod = 1;
	} else {
		if (this.statsPeriod >= 30)
			this.statsPeriod = 10;
		else if (this.statsPeriod >= 10)
			this.statsPeriod = 5;
		else if (this.statsPeriod >= 5)
			this.statsPeriod = 1;
	}
	this.statsStopPolling();
	this.statsStartPolling();
}

statsStartPolling() {
	this.statsPolling();
	this.statsIntervalId = setInterval(async () => { this.statsPolling(); }, 1000 * this.statsPeriod);
}

statsStopPolling() {
	if (this.statsIntervalId)
		clearInterval(this.statsIntervalId);
}

canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
	this.activateUrl = state.url;
	return this.splashDone ? true : this.router.navigate(["/splash"]);
}

}
