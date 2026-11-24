import { Component } from '@angular/core';
import { Global } from '../../env';

@Component({
	selector: 'app-footer',
	templateUrl: './footer.component.html',
	standalone: false
})

export class FooterComponent {
LG(st) { return this.global.mytranslateG(st); }

constructor(public global: Global) {
}

}
