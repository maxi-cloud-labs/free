import { Component, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { IonModal } from '@ionic/angular';
import { Global } from '../env';
import { Settings, CategoriesEx } from '../myinterface';
import { HttpClient } from '@angular/common/http';

@Component({
	selector: 'app-profile',
	templateUrl: './profile.page.html',
	standalone: false
})

export class Profile {
L(st) { return this.global.mytranslate(st); }
@ViewChild("modalTwoFA") modalTwoFA: IonModal;
tabs = ["general", "identity", "security"];
activeTab = this.tabs[0];
twoFA;
formTwoFA: FormGroup;
showQRCode = false;
dataQRCode = " ";
password1Show:boolean = false;
progress:boolean = false;
errorSt = null;
externalIP = "";

constructor(public global: Global, private cdr: ChangeDetectorRef, private httpClient: HttpClient, private fb: FormBuilder) {
	global.refreshUI.subscribe(event => {
		this.cdr.detectChanges();
	});
	this.formTwoFA = fb.group({
		"password1": [ "", [ Validators.required ] ]
	});
	this.global.getExternalIP().then((ip) => { this.externalIP = ip; });
	this.twoFA = this.global.session?.user?.twoFactorEnabled;
}

@HostListener("document:keydown", ["$event"]) handleKeyboardEvent(event: KeyboardEvent) {
	if (event.ctrlKey && (event.key == '~' || (event.shiftKey && event.keyCode == 192) || event.keyCode == 37 || event.keyCode == 40))
		this.activeTab = this.tabs[(this.tabs.indexOf(this.activeTab) - 1 + this.tabs.length) % this.tabs.length];
	else if (event.ctrlKey && (event.key == '`' || event.keyCode == 192 || event.keyCode == 38 || event.keyCode == 39))
		this.activeTab = this.tabs[(this.tabs.indexOf(this.activeTab) + 1) % this.tabs.length];
}

get password1() { return this.formTwoFA.get("password1"); }

async doTwoFA() {
	this.progress = true;
	this.errorSt = null;
	const data = { password:this.password1.value, issuer:"MyDongle.Cloud" };
	const currentTwoFA = this.twoFA;
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/two-factor/" + (currentTwoFA ? "disable" : "enable"), JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth two-factor/" + (currentTwoFA ? "disable" : "enable") + ": ", ret);
	} catch(e) { this.errorSt = e.error.message; }
	this.progress = false;
	if (ret != null) {
		this.twoFA = !currentTwoFA;
		this.global.session.user.twoFactorEnabled = this.twoFA;
		if (this.twoFA) {
			this.dataQRCode = ret["totpURI"];
			this.showQRCode = true;
		} else
			this.modalTwoFA.dismiss();
	}
}

async showTwoFA() {
	setTimeout(() => { this.twoFA = !this.twoFA; }, 10);
	await this.modalTwoFA.present();
}

closeTwoFA() {
	this.modalTwoFA.dismiss();
}

resetSettings() {
	this.global.settings = { lang:"en", welcomeTourShown:false } as Settings;
	this.global.settingsSave();
	this.global.presentToast("The settings of this profile have been resetted!", "alert-circle-outline");
}

}
