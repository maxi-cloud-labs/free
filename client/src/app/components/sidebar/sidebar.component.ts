import { Component, ElementRef, Renderer2, AfterViewInit, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { Global } from '../../env';

@Component({
	selector: 'app-sidebar',
	templateUrl: './sidebar.component.html',
	standalone: false
})

export class SidebarComponent implements AfterViewInit, OnDestroy {
LG(st) { return this.global.mytranslateG(st); }
showMobileMenu: boolean = false;
@Input() public modulesTotal = null;
private documentClickListener: (() => void) | null = null;
cards = this.global.modulesData;
sidebarFilteredModules;

constructor(public global: Global, private cdr: ChangeDetectorRef, private elRef: ElementRef, private renderer: Renderer2) {
	this.sidebarFilterCards();
}

ngAfterViewInit() {
	this.documentClickListener = this.renderer.listen('document', 'click', (event: Event) => {
		const userMobileMenu = this.elRef.nativeElement.querySelector(".user-mobile-menu");
		const userMobileButton = this.elRef.nativeElement.querySelector(".user-mobile-button");
		if (this.showMobileMenu && userMobileMenu && userMobileButton && !userMobileMenu.contains(event.target) && !userMobileButton.contains(event.target)) {
			this.showMobileMenu = false;
			this.cdr.markForCheck();
		}
	});
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
