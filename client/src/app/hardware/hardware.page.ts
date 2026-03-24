import { Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { BleService } from '../ble';
import { Global } from '../env';

declare var appInit: any;
declare var appButton: any;
declare var appConnectToggle: any;
declare var appRefreshScreen: any;
declare var appShutdown: any;
declare var appOtp: any;
declare var appLanguage: any;

@Component({
	selector: 'app-hardware',
	templateUrl: './hardware.page.html',
	standalone: false
})

export class Hardware {
L(st) { return this.global.mytranslate(st); }
typeBluetooth: boolean = false;
@ViewChild("canvasE") canvasE: ElementRef;

constructor(public global: Global, private cdr: ChangeDetectorRef, public ble: BleService) {
	global.refreshUI.subscribe(event => {
		this.cdr.detectChanges();
	});
	ble.communicationEvent.subscribe((event) => {
	});
}

async ngAfterViewInit() {
	await appInit("assets/js/app.js", false, true, this.canvasE.nativeElement, this.global.session?.cloud);
	setTimeout(appRefreshScreen, 250);
	this.ble.connectedWS = 2;
}

button(k, l) {
	appButton(k, l);
}

connectToggle() {
	if (this.typeBluetooth)
		this.ble.connectToggle();
	else
		appConnectToggle();
}

shutdown() {
	if (this.typeBluetooth)
		this.ble.shutdown();
	else
		appShutdown();
}

otp() {
	const email = this.global.session?.user?.email;
	if (this.typeBluetooth)
		this.ble.otp(email);
	else
		appOtp(email);
}

language(la) {
	if (this.typeBluetooth)
		this.ble.language(la);
	else
		appLanguage(la);
}

}
