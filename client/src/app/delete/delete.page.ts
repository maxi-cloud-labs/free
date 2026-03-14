import { Component, ViewChildren, ViewChild, QueryList, ElementRef, ChangeDetectorRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Global } from '../env';

@Component({
	selector: 'app-delete',
	templateUrl: 'delete.page.html',
	standalone: false
})

export class Delete {
L(st) { return this.global.mytranslate(st); }
@ViewChild("emailE") emailE: ElementRef;
ready:boolean = false;
progress:boolean = false;
showEmailSent: boolean = false;
formEmail: FormGroup;
hasBlurredOnce: boolean = false;
errorSt = null;

constructor(public global: Global, private router: Router, private httpClient: HttpClient, private cdr: ChangeDetectorRef, private fb: FormBuilder) {
	this.formEmail = fb.group({
		"email": ["", [Validators.required, Validators.email]]
	});
	this.init();
}

handleBlur(event, element) {
	const inputElement = event.target as HTMLInputElement;
	if (!this.hasBlurredOnce) {
		if (!inputElement.value)
			element.markAsUntouched();
		this.hasBlurredOnce = true;
	}
}

async init() {
	const params = new URLSearchParams(window.location.search);
	if (params.has("token")) {
		await this.doVerify(params.get("token"));
		return;
	}
	this.ready = true;
	this.hasBlurredOnce = false;
	this.errorSt = null;
	setTimeout(() => { this.emailE.nativeElement.focus(); }, 100);
}

get email() { return this.formEmail.get("email"); }

async doSendEmail() {
	this.progress = true;
	this.errorSt = null;
	const data = { email:this.email.value };
	let ret = null;
	try {
		ret = await this.httpClient.post(this.global.SERVERURL + "/master/delete.json", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Master delete: ", ret);
	} catch(e) { this.errorSt = e.error.message; }
	this.progress = false;
	if (ret != null)
		this.showEmailSent = true;
	else
		this.cdr.detectChanges();
}

async doVerify(token) {
	let ret = null;
	const data = { token };
	try {
		ret = await this.httpClient.post(this.global.SERVERURL + "/master/delete.json", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Master delete: ", ret);
	} catch(e) { alert("Wrong or expired delete link"); }
	if (ret != null)
		await this.global.presentAlert("Deletion", "Your account has been deleted.", ".");
	document.location.href = "https://maxi.cloud";
}

}
