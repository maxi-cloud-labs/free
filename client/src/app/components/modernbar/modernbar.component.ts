import { Component, ViewChild, ElementRef, ChangeDetectorRef, HostListener, Input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { CategoriesOrg } from '../../myinterface';
import { Global } from '../../env';

@Component({
	selector: 'app-modernbar',
	templateUrl: './modernbar.component.html',
	standalone: false
})

export class ModernbarComponent {
LG(st) { return this.global.mytranslateG(st); }
LMT(st) { return this.global.mytranslateMT(st); }
showSidebar: boolean = false;
@ViewChild("searchTermE") searchTermE: ElementRef;
@Input() title = "";
private documentClickListener: (() => void) | null = null;
cards = this.global.modulesData;
sidebarFilteredModules;
category: string = "All";
showUserMenu = false;
filteredCards = [];
filteredGithubStars;
CategoriesOrg = Object.values(CategoriesOrg);
showMenuCategories = false;
searchTerm: string = "";

constructor(public global: Global, private cdr: ChangeDetectorRef, private router: Router) {
	this.filterCards();
	this.showMenuCategories = false;
	this.sidebarFilterCards();
	this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
		if (event instanceof NavigationEnd) {
			this.searchTerm = "";
			this.showSidebar = false;
			this.showMenuCategories = false;
			this.showUserMenu = false;
			this.filterCards();
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

toggleUserMenu() {
	this.showUserMenu = !this.showUserMenu;
}

getInitials() {
	const st = this.global.session?.user?.name ?? "";
	const nameParts = st.trim().split(" ");
	const initials = nameParts.map(name => name.charAt(0)).join("").toUpperCase();
	return initials;
}

private lastCtrlFPressTimestamp: number = 0;
@HostListener("document:keydown", ["$event"]) handleKeyboardEvent(event: KeyboardEvent) {
	const isCtrlF = (event.ctrlKey || event.metaKey) && event.key === "f";
	if (isCtrlF) {
		const currentTime = Date.now();
		const timeDifference = currentTime - this.lastCtrlFPressTimestamp;
		if (timeDifference < 5000) {
			this.lastCtrlFPressTimestamp = 0;
			this.global.dismissToast();
			this.searchTermE.nativeElement.blur();
			return;
		} else {
			this.lastCtrlFPressTimestamp = currentTime;
			event.preventDefault();
			this.searchTermE.nativeElement.focus();
			this.global.presentToast("Type Ctrl-F a second time for the browser search", "info", {} , true);
		}
	}
}

filterCards(typing = false) {
	const input = this.searchTerm.toLowerCase();
	if (!input.trim()) {
		this.filteredCards = this.cards.filter(card => {
			if (this.global.showTerminal == false && card.web == false)
				return false;
			if (this.global.showDone == false && card.finished)
				return false;
			if (this.global.showNotDone == false && !card.finished)
				return false;
			if (this.category == "All")
				return true;
			else if (this.category == "Recommended")
				return card.recommended;
			else if (this.category == "Tag")
				return this.global.settings.tags.includes(card.module);
			else
				return card.category.includes(this.category);
		});
	} else {
		const isFinalized = input.endsWith(" ");
		const tokens = [...input.toLowerCase().matchAll(/"([^"]+)"|(\S+)/g)].map(m => m[1] || m[2]);
		let retAtLeastOnceTerminal = false;
		let retAtLeastOnceDone = false;
		let retAtLeastOnceNotDone = false;
		let retAtLeastOnceCategory = false;
		this.filteredCards = this.cards.filter(card => {
			const ret = this.validation(input, isFinalized, tokens, card.hayStack);
			if (ret) {
				if (this.global.showTerminal == false && card.web == false)
					retAtLeastOnceTerminal = true;
				if (this.global.showDone == false && card.finished)
					retAtLeastOnceDone = true;
				if (this.global.showNotDone == false && !card.finished)
					retAtLeastOnceNotDone = true;
				if (this.category != "All")
					retAtLeastOnceCategory = true;
			}
			if (this.global.showTerminal == false && card.web == false)
				return false;
			if (this.global.showDone == false && card.finished)
				return false;
			if (this.global.showNotDone == false && !card.finished)
				return false;
			if (this.category == "All")
				return ret;
			else if (this.category == "Recommended")
				return ret && card.recommended;
			else if (this.category == "Tag")
				return ret && this.global.settings.tags.includes(card.module);
			else
				return ret && card.category.includes(this.category);
		});
		if (typing && this.filteredCards.length == 0 && (retAtLeastOnceTerminal || retAtLeastOnceDone || retAtLeastOnceNotDone || retAtLeastOnceCategory)) {
			if (retAtLeastOnceTerminal)
				this.global.showTerminal = true;
			if (retAtLeastOnceDone)
				this.global.showDone = true;
			if (retAtLeastOnceNotDone)
				this.global.showNotDone = true;
			if (retAtLeastOnceCategory)
				this.category = "All";
			this.filterCards();
			return;
		}
	}
	this.filteredGithubStars = Object.values(this.filteredCards).reduce((sum, card) => { return sum + (card["githubStars"] ?? 0); }, 0);
	if (this.searchTerm != "" && this.searchTermE)
		this.searchTermE.nativeElement.focus();
}

tag(m) {
	this.cards[this.global.modulesDataFindId(m)]["tag"] = !this.cards[this.global.modulesDataFindId(m)]["tag"];
	this.global.settings.tags = this.cards.filter(card => card.tag === true).map(card => card.module);//.join("|");
	this.global.settingsSave();
	if (this.category == "Tag")
		this.filterCards();
	this.sidebarFilterCards();
}

}
