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
@ViewChild("name1E") name1E: ElementRef;
@ViewChild("email1E") email1E: ElementRef;
ready:boolean = false;
progress:boolean = false;
showSuccess: boolean = false;
formDelete: FormGroup;
hasBlurredOnce: boolean = false;
errorSt = null;

constructor(public global: Global, private router: Router, private httpClient: HttpClient, private cdr: ChangeDetectorRef, private fb: FormBuilder) {
	this.formDelete = fb.group({
		"name1": [ "", [ Validators.required, this.checkname1 ] ],
		"email1": [ "", [ Validators.required, Validators.email ] ]
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
	this.ready = true;
	this.hasBlurredOnce = false;
	this.errorSt = null;
	setTimeout(() => { this.name1E.nativeElement.focus(); }, 100);
}

checkname1(group: FormGroup) {
	return /[a-z0-9]{5,20}$/i.test(group.value) ? null : {"invalid": true};
}

get name1() { return this.formDelete.get("name1"); }
get email1() { return this.formDelete.get("email1"); }

async doDelete() {
	this.progress = true;
	this.errorSt = null;
	let ret = null;
	try {
		ret = await this.httpClient.post(this.global.SERVERURL + "/master/delete.json", "name=" + encodeURIComponent(this.name1.value) + "&email=" + encodeURIComponent(this.email1.value), { headers:{ "content-type":"application/x-www-form-urlencoded" } }).toPromise();
		this.global.consolelog(2, "Master delete: ", ret);
	} catch(e) { this.errorSt = e.error.message; }
	this.progress = false;
	if (ret != null)
		this.showSuccess = true;
	else
		alert("An error has occured, nothing has been deleted.");
}

}
