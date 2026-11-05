import { Component, ChangeDetectorRef, Input } from '@angular/core';
import { Global } from '../../env';

@Component({
	selector: 'app-sidebar',
	templateUrl: './sidebar.component.html',
	standalone: false
})

export class SidebarComponent {
LG(st) { return this.global.mytranslateG(st); }
showSidebar: boolean = true;
@Input() public modulesTotal = null;
private documentClickListener: (() => void) | null = null;
cards = this.global.modulesData;
sidebarFilteredModules;

constructor(public global: Global, private cdr: ChangeDetectorRef) {
	this.sidebarFilterCards();
}

ngOnDestroy() {
	if (this.documentClickListener) {
		this.documentClickListener();
		this.documentClickListener = null;
	}
}

refresh() {
	this.cdr.detectChanges();
}

sidebarFilterClick(type) {
	if (this.global.sidebarFilterType == type)
		this.global.sidebarFilterType = "";
}

validation(input, isFinalized, tokens, keywords) {
	return tokens.every((token, index) => {
		const isLastToken = index === tokens.length - 1;
		const isQuoted = input.includes(`"${token}"`);
		return keywords.some(kw => {
			if (isQuoted || !isLastToken || isFinalized)
				return kw === token || kw.split(" ").some(word => word === token);
			return kw.split(" ").some(word => word.startsWith(token));
		});
	});
}

sidebarFilterCards() {
	const input = this.global.sidebarSearchTerm.toLowerCase();
	const retI = (!input.trim()) ? true : false;
	const isFinalized = retI ? false : input.endsWith(" ");
	const tokens = retI ? [] : [...input.toLowerCase().matchAll(/"([^"]+)"|(\S+)/g)].map(m => m[1] || m[2]);
	this.sidebarFilteredModules = this.cards.filter(card => {
		if (this.global.sidebarFilterType == "recommended")
			return card.recommended && card.web;
		else if (this.global.sidebarFilterType == "tag")
			return this.global.settings.tags.includes(card.module);
		else if (this.global.sidebarFilterType == "search")
			return !retI && this.validation(input, isFinalized, tokens, card.hayStack);
		else
			return false;
	});
}

}
