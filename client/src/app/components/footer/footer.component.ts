import { Component } from '@angular/core';
import { Global } from '../../env';

@Component({
	selector: 'app-footer',
	templateUrl: './footer.component.html',
	standalone: false
})

export class FooterComponent {
languages = [
	{ code:"en", name:"English" },
	{ code:"fr", name:"Français" },
	{ code:"it", name:"Italiano" },
	{ code:"de", name:"Deutsch" },
	{ code:"es", name:"Español" },
	{ code:"pt", name:"Português" },
	{ code:"ja", name:"日本語" },
	{ code:"ko", name:"한국어" },
	{ code:"zh", name:"简体中文" }
];

LG(st) { return this.global.mytranslateG(st); }

constructor(public global: Global) {
}

}
