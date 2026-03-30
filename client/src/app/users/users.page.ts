import { Component, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { Global } from '../env';
import { HttpClient } from '@angular/common/http';

@Component({
	selector: 'app-users',
	templateUrl: './users.page.html',
	standalone: false
})

export class Users {
L(st) { return this.global.mytranslate(st); }
LMT(st) { return this.global.mytranslateMT(st); }
users;

constructor(public global: Global, private cdr: ChangeDetectorRef, private httpClient: HttpClient) {
	global.refreshUI.subscribe(event => {
		this.cdr.detectChanges();
	});
	this.getData();
}

async getData() {
	this.users = await this.httpClient.get("/_app_/auth/admin/list-users", {headers:{"content-type": "application/json"}}).toPromise();
	this.global.consolelog(2, "Auth admin/list-users: ", this.users);
}

async setEmail(userId, event) {
	const email = (event.target as HTMLSelectElement).value;
	const data = { userId, data:{ email } };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/admin/update-user", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth admin/update-user: ", ret);
	} catch(e) {
		this.global.consolelog(1, e.error.message);
		this.global.presentToast("An internal error has occured.", "error");
	}
}

async setUsername(userId, event) {
	const username = (event.target as HTMLSelectElement).value;
	const data = { userId, data:{ username } };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/admin/update-user", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth admin/update-user: ", ret);
	} catch(e) {
		this.global.consolelog(1, e.error.message);
		this.global.presentToast("An internal error has occured.", "error");
	}
}

async setRole(userId, event) {
	const role = (event.target as HTMLSelectElement).value;
	const data = { userId, role };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/admin/set-role", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth admin/set-role: ", ret);
	} catch(e) {
		this.global.consolelog(1, e.error.message);
		this.global.presentToast("An internal error has occured.", "error");
	}
}

async resetPassword(userId) {
	const newPassword = Math.random().toString(36).substring(2, 12);
	const data = { userId, newPassword };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/admin/set-user-password", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth admin/set-user-password: ", ret);
	} catch(e) { this.global.consolelog(1, e.error.message);
		this.global.presentToast("An internal error has occured.", "error"); return; }
	this.global.presentToast("The new password is:<br>" + newPassword, "success", { timeout:0 } );
}

async setApproved(userId, event) {
	const approved = (event.target as HTMLInputElement).checked;
	const data = { userId, data:{ approved } };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/admin/update-user", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth admin/update-user: ", ret);
	} catch(e) {
		this.global.consolelog(1, e.error.message);
		this.global.presentToast("An internal error has occured.", "error");
	}
}

}
