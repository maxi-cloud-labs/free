import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { NavController, AlertController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { environment } from '../environments/environment';
import { Settings } from './myinterface';
import { VERSION } from './version';

@Injectable({
	providedIn: "root"
})

export class Global {
developer: boolean = false;
demo: boolean = false;
VERSION: string = VERSION;
SERVERURL: string = "https://maxi.cloud";
language;
settings: Settings = {} as Settings;
DONGLEURL: string;
refreshUI:Subject<any> = new Subject();
session;
themeSel = "system";
darkVal = false;

constructor(public plt: Platform, private router: Router, private navCtrl: NavController, private alertCtrl: AlertController, private translate: TranslateService, private httpClient: HttpClient) {
	this.developer = window.location.hostname == "localhost" && window.location.port == "8100";
	this.consolelog(0, "%c⛅ mAxI cloud: my data, my cloud, my sovereignty 🚀", "font-weight:bold; font-size:x-large;");
	this.consolelog(0, "%cDocs: https://docs.maxi.cloud", "font-weight:bold; font-size:large;");
	this.consolelog(0, "%cVersion: " + this.VERSION, "background-color:#646464; border-radius:5px; padding:5px;");
	this.consolelog(0, "%cPlease give a ⭐ to this project at:", "color:black; background-color:#fef9c2; border-radius:5px; padding:5px;");
	this.consolelog(0, "%chttps://github.com/mAxIcloud/Free", "border:1px solid white; border-radius:5px; padding:5px; font-weight:bold;");
	this.consolelog(1, "Platform: " + this.plt.platforms());
	navCtrl.setDirection("forward");
	translate.setDefaultLang("en");
	this.consolelog(1, "Default browser language: " + translate.getBrowserLang());
	if (window.location.hostname.indexOf("mondongle.cloud") != -1)
		this.changeLanguage("fr");
	else
		this.changeLanguage(this.translate.getBrowserLang());
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { this.themeSet(); });
	this.themeSet();
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

domainFromFqdn(fqdn) {
	const parts = fqdn.split('.');
	if (parts.length <= 2)
		return fqdn;
	if (!isNaN(parts[parts.length - 1]))
		return fqdn;
	const sliceIndex = (parts[parts.length - 2] === "maxi") ? -3 : -2;
	return parts.slice(sliceIndex).join('.');
}

setCookie(name, value) {
	const host = window.location.hostname.replace(/^([^:]*)(?::\d+)?$/i, '$1');
	const domain = this.domainFromFqdn(host);
	if (value == "")
		document.cookie = `${name}=; Domain=${domain}; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
	else
		document.cookie = `${name}=${value}; Domain=${domain}; Path=/;`;
}

async AuthStatus() {
	const ret = await this.httpClient.get("/_app_/auth/status", {headers:{"content-type": "application/json"}}).toPromise();
	this.consolelog(2, "Auth Status: ", ret);
}

async getSession() {
	this.session = await this.httpClient.get("/_app_/auth/get-session", {headers:{"content-type": "application/json"}}).toPromise();
	this.consolelog(2, "Auth get-session: ", this.session);
	if (this.session != null) {
		const jwt = await this.httpClient.get("/_app_/auth/token", {headers:{"content-type": "application/json"}}).toPromise();
		this.setCookie("jwt", jwt["token"]);
	}
}

async logout() {
	this.consolelog(1, "logout");
	document.location.href = "/";
}

async statusRefresh(data) {
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

async presentAlert(hd, st, msg, key:string = "") {
	let checked = false;
//	if (this.settings.dontShowAgain?.[key] !== undefined)
//		return;
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
//	if (checked) {
//		this.settings.dontShowAgain[key] = true;
//		this.settingsSave();
//	}
}

async changeLanguage(st) {
	if (st != this.language) {
		this.language = st;
		await this.translate.use(this.language);
	}
}

mytranslateP(page, st) {
	const inp = page + "." + st;
	const ret = this.translate.instant(page + "." + st);
	return ret == "" ? (this.developer && this.language != "en" ? ("##" + st + "##") : st) : ret == inp ? (this.developer ? ("##" + st + "##") : st) : ret;
}

mytranslate(st) {
	return this.mytranslateP(this.router.url.replace(/^\/|(\?).*$/g, ""), st);
}

mytranslateG(st) {
	return this.mytranslateP("global", st);
}

async sleepms(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
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

}
