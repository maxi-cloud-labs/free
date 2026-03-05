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
	if (now)
		this.hide = true;
	else
	    setTimeout(() => { this.hide = true; }, 1000);
	this.show = false;
    this.removeEscapeListener();
}

showToast(message, icon, delay) {
	this.delay = delay;
	this.message = message;
	this.icon = icon;
	this.instant = false;
	this.hide = false;
    setTimeout(() => { this.show = true; }, 10);
	if (delay > 0)
	    setTimeout(() => { this.dismissToast(false); }, delay);
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
