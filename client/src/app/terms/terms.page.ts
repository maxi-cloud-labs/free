import { Component } from '@angular/core';
import { Global } from '../env';

@Component({
	selector: 'app-terms',
	templateUrl: 'terms.page.html',
	standalone: false
})

export class Terms {
L(st) { return this.global.mytranslate(st); }
LG(st) { return this.global.mytranslateG(st); }

constructor(public global: Global) {}

}
