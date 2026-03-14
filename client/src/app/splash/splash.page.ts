import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Global } from '../env';
import { BleService } from '../ble';
import { HttpClient } from '@angular/common/http';

@Component({
	selector: 'app-splash',
	templateUrl: 'splash.page.html',
	standalone: false
})

export class Splash {
L(st) { return this.global.mytranslate(st); }
showUpgrade: boolean = false;

constructor(public global: Global, private router: Router, private bleService: BleService, private httpClient: HttpClient) {
	this.forwardWhenReady();
}

async forwardWhenReady() {
	try {
		const response = await Promise.race([
			new Promise( resolve => { setTimeout(resolve, 2000) } ),
			this.httpClient.post(this.global.SERVERURL + "/master/version.json", "", {headers:{"content-type": "application/x-www-form-urlencoded"}}).toPromise()
		]);
		if (response === undefined)
			this.global.consolelog(1, "forwardWhenReady: Timeout");
		else {
			const appVersionRequired = response["version"] ?? "";
			this.global.consolelog(1, "Required App Version: " + appVersionRequired);
			if (this.global.VERSION < appVersionRequired) {
				this.showUpgrade = true;
				return;
			}
		}
	} catch(e) { this.global.consolelog(1, "forwardWhenReady: " + e); }
	this.global.splashDone = true;
	let count = 20;
	while (this.global.session === undefined && count-- > 0)
		await this.global.sleepms(100);
	if (this.global.activateUrl === undefined || this.global.activateUrl == "/splash")
		this.global.activateUrl = "/";
	this.router.navigateByUrl(this.global.session != null ? this.global.activateUrl : "/login");
}

openUpgrade() {
	let url = this.global.SERVERURL + "";
	if (this.global.plt.is("android"))
		url = "https://play.google.com/store/apps/details?id=cloud.maxi.app";
	else if (this.global.plt.is("ios"))
		url = "https://apps.apple.com/us/app/in-out-sport/id";
	window.open(url, "_blank");
}

}
