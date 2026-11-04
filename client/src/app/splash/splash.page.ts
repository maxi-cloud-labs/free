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

constructor(public global: Global, private router: Router, private bleService: BleService, private httpClient: HttpClient) {
	this.forwardWhenReady();
}

async forwardWhenReady() {
	this.global.splashDone = true;
	let count = 20;
	while (this.global.session === undefined && count-- > 0)
		await this.global.sleepms(100);
	if (this.global.activateUrl === undefined || this.global.activateUrl == "/splash")
		this.global.activateUrl = "/";
	this.router.navigateByUrl(this.global.session != null ? this.global.activateUrl : "/login");
}

}
