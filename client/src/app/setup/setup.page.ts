import { Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { IonModal } from '@ionic/angular';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Global } from '../env';
import { Certificate } from '../certificate';
import { BleService } from '../ble';

declare var appConnectToggle: any;
declare var appSend: any;

@Component({
	selector: 'app-setup',
	templateUrl: 'setup.page.html',
	standalone: false
})

export class Setup {
L(st) { return this.global.mytranslate(st); }
@ViewChild("name1E") name1E: ElementRef;
@ViewChild("displayname2E") displayname2E: ElementRef;
@ViewChild("ssid3E") ssid3E: ElementRef;
@ViewChild("modalWait") modalWait: IonModal;
password2Show:boolean = false;
password3Show:boolean = true;
progress:boolean = false;
showDomain:boolean = true;
showPassword:boolean = false;
showWiFi:boolean = false;
formDomain: FormGroup;
formPassword: FormGroup;
formWiFi: FormGroup;
hasBlurredOnce: boolean = false;
errorSt = null;
ssids = null;

constructor(public global: Global, public certificate: Certificate, private router: Router, private httpClient: HttpClient, private cdr: ChangeDetectorRef, private fb: FormBuilder, public ble: BleService) {
	global.refreshUI.subscribe(event => {
		this.cdr.detectChanges();
	});
	ble.communicationEvent.subscribe((event) => {
		if (event.msg == "communication")
			this.handleBleMessage(event.data);
		if (event.msg == "connection" && ble.connectedBLE == 2)
			setTimeout(() => { this.ble.writeData({ a:"cloud" }); }, 2000);
		if (event.msg == "connection" && ble.connectedWS == 2)
			setTimeout(() => { appSend({ a:"cloud" }); }, 100);
	});
	this.formDomain = fb.group({
		"name1": [ "", [ this.checkname1 ] ],
		"shortname1": [ "", [ this.checkShortname1 ] ],
		"domain1": [ "", [ this.checkDomain1.bind(this) ] ],
		"terms1": [ false, Validators.requiredTrue ]
	}, { validator: this.checkFormDomain } );
	this.formPassword = fb.group({
		"displayname2": [ "", [ Validators.required, Validators.minLength(2) ] ],
		"email2": [ "", [ Validators.required, Validators.email ] ],
		"password2": [ "", [ Validators.required, Validators.minLength(6) ] ],
		"password2Confirm": [ "", [Validators.required ] ]
	}, { validator: this.checkFormPassword });
	this.formWiFi = fb.group({
		"ssid3": [ "", [ Validators.required, Validators.minLength(1) ] ],
		"password3": [ "", [ Validators.required, Validators.minLength(8) ] ]
	});
	appConnectToggle(true);
}

async ngOnInit() {
	this.show_Domain();
}

async handleBleMessage(data) {
	if (data.a === "cloud") {
		if (data.info?.name !== undefined) {
			try {
				this.ble.disconnect();
			} catch(e) {}
			await this.global.presentAlert("Denial", "This hardware is already setup. You need to reset it.", "Press the two bottom buttons at the same time and follow the instructions on screen.");
			this.router.navigate(["/find"]);
		}
	} else if (data.a === "setup") {
		if (data.success === 1) {
			this.progress = false;
			this.cdr.detectChanges();
			await this.global.presentAlert("Success!", "Your hardware is setting up!", "You will need to login now.");
			document.location.href = "https://app." + this.name1.value + ".mydongle.cloud";
		} else {
			this.errorSt = "An error occured, please try again.";
			this.progress = false;
			this.cdr.detectChanges();
		}
	} else if (data.ssids)
		this.ssids = data.ssids.map(net => `${net.ssid} (${net.strength}%)`).join(", ");
}

handleBlur(event, element) {
	const inputElement = event.target as HTMLInputElement;
	if (!this.hasBlurredOnce) {
		if (!inputElement.value)
			element.markAsUntouched();
		this.hasBlurredOnce = true;
	}
}

passwordStrength(password) {
	if (!password) return "weak";
	let score = 0;
	if (password.length >= 8) score += 1;
	if (password.length >= 12) score += 1;
	if (/[a-z]/.test(password)) score += 1;
	if (/[A-Z]/.test(password)) score += 1;
	if (/[0-9]/.test(password)) score += 1;
	if (/[^A-Za-z0-9]/.test(password)) score += 1;
	if (score <= 2) return "weak";
	if (score <= 4) return "medium";
	return "strong";
}

passwordStrengthPercentage(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min((score / 6) * 100, 100);
}

checkFormDomain = () => {
	if (this.ble.connectedBLE != 2 && this.ble.connectedWS != 2 && this.formDomain?.controls?.terms1?.value)
		this.errorSt = "You need to connect to your hardware";
	return (this.ble.connectedBLE == 2 || this.ble.connectedWS == 2) ? null : { "notconnected": true };
}

checkname1(group: FormGroup) {
	return /[a-z0-9]{5,20}$/i.test(group.value) ? null : {"invalid": true};
}

checkShortname1(group: FormGroup) {
	return /[a-z0-9]{2,20}$/i.test(group.value) ? null : {"invalid": true};
}

checkDomain1(group: FormGroup) {
	if (group.value == "")
		this.errorSt = null;
	return group.value == "" || /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/i.test(group.value) ? null : {"invalid": true};
}

checkFormPassword(group: FormGroup) {
	return group.controls.password2.value == group.controls.password2Confirm.value ? null : {"mismatch": true};
}

async verifyDns(st) {
	this.progress = true;
	const ret = await this.httpClient.post(this.global.SERVERURL + "/master/setup-dns.json", "domain=" + encodeURIComponent(st), { headers:{ "content-type":"application/x-www-form-urlencoded" } }).toPromise();
	this.global.consolelog(2, "Master dns", ret);
	let res = false;
	if (Array.isArray(ret)) 
		ret.forEach((dns) => {
			if (/^ns[1-2]\.mydongle\.cloud$/i.test(dns))
				res = true;
		});
	this.errorSt = res ? null : "DNS doesn't point correctly.";
	this.progress = false;
	this.cdr.detectChanges();
	return res;
}

async wifiScan() {
	const data = { a:"wifi-scan" }
	if (this.ble.connectedWS == 2)
		appSend(data);
	else if (this.ble.connectedBLE == 2)
		this.ble.writeData(data);
	else
		alert("Hardware not connected");
}

connectToggle() {
	this.ble.connectToggle();
}

get name1() { return this.formDomain.get("name1"); }
get shortname1() { return this.formDomain.get("shortname1"); }
get domain1() { return this.formDomain.get("domain1"); }
get terms1() { return this.formDomain.get("terms1"); }
get email2() { return this.formPassword.get("email2"); }
get displayname2() { return this.formPassword.get("displayname2"); }
get password2() { return this.formPassword.get("password2"); }
get password2Confirm() { return this.formPassword.get("password2Confirm"); }
get ssid3() { return this.formWiFi.get("ssid3"); }
get password3() { return this.formWiFi.get("password3"); }

show_Domain() {
	this.showDomain = true;
	this.showPassword = false;
	this.showWiFi = false;
	this.hasBlurredOnce = false;
	setTimeout(() => { this.name1E.nativeElement.focus(); }, 100);
	//this.cdr.detectChanges();
}

async doDomain() {
	this.progress = true;
	this.errorSt = null;
	const ret = await this.httpClient.post(this.global.SERVERURL + "/master/setup-domain.json", "name=" + encodeURIComponent(this.name1.value) + "&shortname=" + encodeURIComponent(this.shortname1.value), { headers:{ "content-type":"application/x-www-form-urlencoded" } }).toPromise();
	this.global.consolelog(2, "Master domain", ret);
	if (ret["status"] === "success") {
		if (this.formDomain.controls.domain1.value != "") {
			const ret = await this.verifyDns(this.formDomain.controls.domain1.value);
			if (ret)
				this.show_Password();
		} else
			this.show_Password();
	} else {
		if (ret["name"] && ret["shortname"])
			this.errorSt = this.name1.value + " is not available ; " + this.shortname1.value + " is not available";
		else if (ret["name"])
			this.errorSt = this.name1.value + " is not available";
		else if (ret["shortname"])
			this.errorSt = this.shortname1.value + " is not available";
	}
	this.progress = false;
}

show_Password() {
	this.showDomain = false;
	this.showPassword = true;
	this.showWiFi = false;
	setTimeout(() => { this.displayname2E.nativeElement.focus(); }, 100);
	this.hasBlurredOnce = false;
	this.cdr.detectChanges();
}

async doPassword() {
	this.progress = true;
	this.errorSt = null;
	const ret = await this.httpClient.post(this.global.SERVERURL + "/master/setup-password.json", "email=" + encodeURIComponent(this.email2.value), { headers:{ "content-type":"application/x-www-form-urlencoded" } }).toPromise();
	this.global.consolelog(2, "Master password", ret);
	if (ret["status"] !== "success")
		this.errorSt = this.email2.value + " is already in use (for the moment, one email = one cloud)";
	else
		this.show_WiFi();
	this.progress = false;
}

show_WiFi() {
	this.showDomain = false;
	this.showPassword = false;
	this.showWiFi = true;
	setTimeout(() => { this.ssid3E.nativeElement.focus(); }, 100);
	this.hasBlurredOnce = false;
	this.cdr.detectChanges();
}

async doWiFi() {
	this.progress = true;
	this.errorSt = null;
	let ret1 = { fullChain:"", privateKey:"" };
	let ret2 = { ai:{ keys: { _server_:"" } }, frp:{}, postfix:{} };
	await this.modalWait.present();
	try {
		ret1 = await this.certificate.process(this.name1.value, this.shortname1.value, this.domain1.value); //Not used: ret1.accountKey, ret1.accountKeyId
		this.global.consolelog(2, "SETUP: Certificate", ret1);
	} catch(e) {}
	this.modalWait.dismiss();
	try {
		ret2 = await this.httpClient.post(this.global.SERVERURL + "/master/setup-final.json", "name=" + encodeURIComponent(this.name1.value) + "&shortname=" + encodeURIComponent(this.shortname1.value) + "&domain=" + encodeURIComponent(this.domain1.value) + "&email=" + encodeURIComponent(this.email2.value), { headers:{ "content-type":"application/x-www-form-urlencoded" } }).toPromise() as any;
		this.global.consolelog(2, "Master final", ret2);
	} catch(e) {}
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const primary = this.domain1.value != "" ? this.domain1.value : (this.name1.value + ".mydongle.cloud");
	const data = {
		a:"setup",
		cloud: {
			info: {
				language: navigator.language.startsWith("fr") ? "fr" : "en",
				primary,
				name: this.name1.value,
				shortname: this.shortname1.value,
				domain: this.domain1.value
			},
			ai: {
				keys: {
					_server_: ret2.ai.keys._server_
				},
				routingModules: {
					_all_: "_server_"
				},
				routingPerModule: false
			},
			frp: ret2.frp,
			postfix: ret2.postfix,
			security: {
				adminSudo: false,
				autoLogin: true,
				includeTorrent: true,
				grantLocalPermission: true,
				newUserNeedsApproval: true,
				signInNotification: true,
				updateRemoteIP: true
			},
			setup: "none",
			connectivity: {
				wifi: {
					ssid: this.ssid3.value,
					password: this.password3.value
				}
			}
		},
		betterauth: {
			email: this.email2.value,
			name: this.displayname2.value,
			password: this.password2.value
		},
		letsencrypt: {
			fullchain: ret1.fullChain,
			privatekey :ret1.privateKey
		},
		timezone
	};
	this.global.consolelog(2, "SETUP: Sending to hardware:", data);
	if (this.ble.connectedWS == 2)
		appSend(data);
	else if (this.ble.connectedBLE == 2)
		await this.ble.writeData(data);
	else
		alert("Hardware not connected");
	this.cdr.detectChanges();
}

}
