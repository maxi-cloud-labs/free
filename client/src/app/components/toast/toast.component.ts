import { Component, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Global } from '../../env';

@Component({
	selector: 'app-toast',
	templateUrl: './toast.component.html',
	standalone: false
})

export class ToastComponent {
LG(st) { return this.global.mytranslateG(st); }
@ViewChild("toastE") toastE: ElementRef;
hide: boolean = true;
show: boolean = false;
instant: boolean = false;
message: string = "";
icon: string = "";
delay;
autoHideTimer = null;

constructor(public global: Global, private cdr: ChangeDetectorRef) {
	global.toast.subscribe(event => {
		if (event.show)
			this.showToast(event.message, event.icon, event.delay);
		else
			this.dismissToast(true);
		this.cdr.detectChanges();
	});
}

dismissToast(now) {
	this.show = false;
    this.removeEscapeListener();
	if (now) {
		this.hide = true;
		if (this.autoHideTimer) {
			clearTimeout(this.autoHideTimer);
			this.autoHideTimer = null;
		}
	} else {
	    setTimeout(() => {
			this.hide = true;
			if (this.autoHideTimer) {
				clearTimeout(this.autoHideTimer);
				this.autoHideTimer = null;
			}
		}, 1000);
	}
}

async showToast(message, icon, delay) {
	if (this.autoHideTimer) {
        setTimeout(() => this.showToast(message, icon, delay), 1000);
        return;
	}
	this.delay = delay;
	this.message = message;
	this.icon = icon;
	this.instant = false;
	this.hide = false;
	this.cdr.detectChanges();
    setTimeout(() => { this.show = true; this.cdr.detectChanges(); }, 10);
	if (delay > 0)
	    this.autoHideTimer = setTimeout(() => { this.dismissToast(false); }, delay);
	else
		this.autoHideTimer = null;
    this.addEscapeListener();
}


handleKeyDown = (event: KeyboardEvent) => {
	if (this.show && event.key === "Escape")
		this.dismissToast(true);
};

addEscapeListener() {
	document.addEventListener("keydown", this.handleKeyDown);
}

removeEscapeListener() {
	document.removeEventListener("keydown", this.handleKeyDown);
}

}
