import { Component } from '@angular/core';
import { Global } from '../env';

@Component({
	selector: 'app-privacy',
	templateUrl: 'privacy.page.html',
	standalone: false
})

export class Privacy {
L(st) { return this.global.mytranslate(st); }
LG(st) { return this.global.mytranslateG(st); }

constructor(public global: Global) {}

}
