import { Component, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { IonModal } from '@ionic/angular';
import { Global } from '../env';
import { HttpClient } from '@angular/common/http';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.page.html',
	standalone: false
})

export class Settings {
L(st) { return this.global.mytranslate(st); }
tabs = ["general", "domains", "connectivity", "vpn", "security"];
activeTab = this.tabs[0];
@ViewChild("modalAlert") modalAlert: IonModal;
adminSudo;
sshKeys = "";
dSshKeys = true;
signInNotification;
dSave: boolean = true;
dWiFi: boolean = true;
externalIP = "";
currentTime: string = "";
selectedTimezone: string = "America/Los_Angeles";
private timer: any;
certificateExpirationDate;
certificateDomains;

constructor(public global: Global, private cdr: ChangeDetectorRef, private httpClient: HttpClient) {
	global.refreshUI.subscribe(event => {
		this.cdr.detectChanges();
	});
	this.adminSudo = true;
	this.signInNotification = true;
	this.dSave = true;
	this.global.getExternalIP().then((ip) => {
		this.externalIP = ip;
		const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;
		if (!this.global.developer && !ipv4Regex.test(window.location.hostname) && !this.global.demo && this.externalIP == this.global.session?.cloud?.hardware?.externalIP && this.global.session?.cloud?.hardware?.internalIP != "")
			this.global.presentToast("You seem to be on the same network as the " + global.session?.cloud?.hardware?.model + ". You can have direct access through <a href='http://" + this.global.session?.cloud?.hardware?.internalIP + ":9400' class='underline' target='_blank'>http://" + this.global.session?.cloud?.hardware?.internalIP + ":9400</a>", "help-outline", 10000);
	});
	this.updateTime();
	this.timer = setInterval(() => { this.updateTime(); }, 1000);
	this.certificateGetInfo();
}

ngAfterViewInit() {
	if (!this.global.session?.cloud?.hardware?.disk?.startsWith("/dev/nvme"))
		this.modalAlert.present();
}

@HostListener("document:keydown", ["$event"]) handleKeyboardEvent(event: KeyboardEvent) {
	if (event.ctrlKey && (event.key == '~' || (event.shiftKey && event.keyCode == 192) || event.keyCode == 37 || event.keyCode == 40))
		this.activeTab = this.tabs[(this.tabs.indexOf(this.activeTab) - 1 + this.tabs.length) % this.tabs.length];
	else if (event.ctrlKey && (event.key == '`' || event.keyCode == 192 || event.keyCode == 38 || event.keyCode == 39))
		this.activeTab = this.tabs[(this.tabs.indexOf(this.activeTab) + 1) % this.tabs.length];
}

async save() {
	const data = { security:{ adminSudo:this.adminSudo, signInNotification:this.signInNotification, sshKeys:this.sshKeys } };
	const ret = await this.httpClient.post("/_app_/auth/settings/save", JSON.stringify(data), { headers:{ "content-type": "application/json" } }).toPromise();
	this.global.consolelog(2, "Auth settings/save: ", ret);
}

async refresh() {
	const ret = await this.httpClient.get("/_app_/auth/refresh", {headers:{"content-type": "application/json"}}).toPromise();
	this.global.consolelog(2, "Auth Refresh: ", ret);
	this.global.presentToast("Modules have been refreshed.", "help-outline");
	this.global.modulesDataPrepare();
}

async wifiG() {
	const ret = await this.httpClient.get("/_app_/auth/settings/wifi", {headers:{"content-type": "application/json"}}).toPromise();
	this.global.consolelog(2, "Auth settings/wifi: ", ret);
}

async wifiApply() {
	const ret = await this.httpClient.get("/_app_/auth/settings/wifi-apply", {headers:{"content-type": "application/json"}}).toPromise();
	this.global.consolelog(2, "Auth settings/wifi-apply: ", ret);
}

async getSshKeys() {
	this.sshKeys = await this.httpClient.get( "/_app_/auth/settings/sshkeys", { responseType: "text" }).toPromise();
	this.dSshKeys = false;
}

async certificateGetInfo() {
	try {
		const ret = await this.httpClient.get( "/_app_/auth/settings/certificate-info", {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth settings/certificate-info: ", ret);
		this.certificateExpirationDate = ret["dateString"];
		this.certificateDomains = ret["domains"].filter(domain => !domain.startsWith("*")).join(", ");
	} catch(e) {}
}

async certificateRenew() {
}

updateTime() {
	const now = new Date();
	this.currentTime = now.toLocaleString("en-US", {
		timeZone: this.selectedTimezone,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});
}

onTimezoneChange(event: Event) {
	const selectElement = event.target as HTMLSelectElement;
	this.selectedTimezone = selectElement.value;
	this.updateTime();
}

}
