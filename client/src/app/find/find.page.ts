import { Component, ViewChild, ElementRef, ChangeDetectorRef, signal } from '@angular/core';
import { FormControl, FormGroup, FormArray, Validators, FormBuilder } from '@angular/forms';
import { IonInput } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Global } from '../env';

@Component({
	selector: 'app-find',
	templateUrl: 'find.page.html',
	standalone: false
})

export class Find {
L(st) { return this.global.mytranslate(st); }
@ViewChild("email1E") email1E: ElementRef;
ready:boolean = false;
progress:boolean = false;
formFind: FormGroup;
hasBlurredOnce: boolean = false;
errorSt = null;

constructor(public global: Global, private httpClient: HttpClient, private cdr: ChangeDetectorRef, private fb: FormBuilder) {
	this.formFind = fb.group({
		"email1": ["", [Validators.required, Validators.email]]
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
	let count = 20;
	while (this.global.session === undefined && count-- > 0)
		await this.global.sleepms(100);
	if (this.global.session != null)
		this.global.logout();
	this.ready = true;
	setTimeout(() => { this.email1E.nativeElement.focus(); }, 100);
}

get email1() { return this.formFind.get("email1"); }

async doFind() {
	this.progress = true;
	this.errorSt = null;
	const data = { email:this.email1.value };
	let ret = null;
	try {
		ret = await this.httpClient.post(this.global.SERVERURL + "/master/find.json", "email=" + encodeURIComponent(this.email1.value), {headers:{"content-type": "application/x-www-form-urlencoded"}}).toPromise();
		this.global.consolelog(1, "Master find: ", ret);
	} catch(e) { this.global.consolelog(1, e); this.errorSt = e.error?.message || e.statusText; }
	this.progress = false;
	if (ret != null) {
		document.cookie = "email=" + this.email1.value + "; Domain=mydongle.cloud; Path=/;";
		window.location.href = ret["url"];
	} else
		this.cdr.detectChanges();
}
form
}
