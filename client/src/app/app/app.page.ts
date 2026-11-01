import { Component, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { Global } from '../env';
import { CategoriesBar, CategoriesOrg } from '../myinterface';
import { BleService } from '../ble';

@Component({
	selector: 'app-app',
	templateUrl: './app.page.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})

export class App {
L(st) { return this.global.mytranslate(st); }
LG(st) { return this.global.mytranslateG(st); }
LK(st) { return this.global.mytranslateK(st); }
LMT(st) { return this.global.mytranslateMT(st); }
LMD(st) { return this.global.mytranslateMD(st); }
@ViewChild(SidebarComponent) sidebarComponent;
@ViewChild("searchTermE") searchTermE: ElementRef;
@ViewChild("sidebar") sidebar: any;
cardIdCur = 0;
cardConfig;
cards = this.global.modulesData;
filteredCards = [];
filteredGithubStars;
searchTerm: string = "";
category: string = "All";
presentation: string = "cards";
showTerminal: boolean = true;
showDone: boolean = true;
showNotDone: boolean = false;
CategoriesBar = CategoriesBar;
CategoriesOrg = CategoriesOrg;
showMenuCategories = false;
showChatbot = true;

constructor(public global: Global, private cdr: ChangeDetectorRef, private httpClient: HttpClient, private route: ActivatedRoute, public ble: BleService) {
	if (this.global.demo)
		this.showNotDone = true;
	global.refreshUI.subscribe(event => {
		if (event === "onlySidebar")
			this.sidebar.refresh();
		else if (event === "refresh")
			this.cdr.detectChanges();
		else if (event === "reset") {
			if (this.searchTerm != "" || this.category != "All") {
				this.searchTerm = "";
				this.category = "All";
				this.filterCards();
				this.cdr.detectChanges();
			}
		}
		else if (event === "modules") {
			this.filterCards();
			this.cdr.detectChanges();
		}
	});
	global.sidebarFilterType = "";
	this.filterCards();
}

pageInit() {
	const sub = this.route.queryParams.subscribe(async (params) => {
		if (params["name"])
			this.cardIdCur = this.global.modulesDataFindId(params["name"]);
		window.scrollTo({ top:0, behavior:"smooth" });
		this.showMenuCategories = false;
		this.cdr.detectChanges();
	});
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

filterCards(typing = false) {
	const input = this.searchTerm.toLowerCase();
	if (!input.trim()) {
		this.filteredCards = this.cards.filter(card => {
			if (this.showTerminal == false && card.web == false)
				return false;
			if (this.showDone == false && card.finished)
				return false;
			if (this.showNotDone == false && !card.finished)
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
				if (this.showTerminal == false && card.web == false)
					retAtLeastOnceTerminal = true;
				if (this.showDone == false && card.finished)
					retAtLeastOnceDone = true;
				if (this.showNotDone == false && !card.finished)
					retAtLeastOnceNotDone = true;
				if (this.category != "All")
					retAtLeastOnceCategory = true;
			}
			if (this.showTerminal == false && card.web == false)
				return false;
			if (this.showDone == false && card.finished)
				return false;
			if (this.showNotDone == false && !card.finished)
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
				this.showTerminal = true;
			if (retAtLeastOnceDone)
				this.showDone = true;
			if (retAtLeastOnceNotDone)
				this.showNotDone = true;
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
	this.sidebarComponent.sidebarFilterCards();
}

async ngOnInit() {
	if (this.global.session.user.role == "admin" && this.global.session.cloud.info.setup == "done1" && await this.global.presentQuestion("First-time setup", "Do you want to do the first-time setup of all modules?", "This takes around 5 minutes during which the system will be extremelly busy. After that, you will be able to use all the modules instantaneously.\nAlternatively, you can disregard this setup. You can either launch it later, meanwhile each module will be automatically set up during first use.", "firsttimesetup"))
		this.global.setup2Start(true);
	this.pageInit();
}

showUserMenu:boolean = false;

toggleUserMenu() {
	this.showUserMenu = !this.showUserMenu;
}

getInitials() {
	const st = this.global.session?.user?.name ?? "";
	const nameParts = st.trim().split(" ");
	const initials = nameParts.map(name => name.charAt(0)).join("").toUpperCase();
	return initials;
}

floor(a) {
	return Math.floor(a);
}








async moduleRefresh() {}

async moduleReset() {}

reviews: any[] = [];          // [{ id, author, date (ISO string), rating (1-5), text }]
reviewSort = "newest";        // newest | oldest | top
reviewsShown = 5;
reviewRating = 0;
reviewHover = 0;
private reviewsMemo: any = { src: null, sort: "", n: -1, out: [] };

/** Sorted + paged list. Memoised so ngFor never receives a new array on every change detection. */
get reviewsView(): any[] {
	const m = this.reviewsMemo;
	if (m.src !== this.reviews || m.sort !== this.reviewSort || m.n !== this.reviewsShown) {
		const list = [...this.reviews];
		if (this.reviewSort === "oldest")
			list.sort((a, b) => a.date.localeCompare(b.date));
		else if (this.reviewSort === "top")
			list.sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date));
		else
			list.sort((a, b) => b.date.localeCompare(a.date));
		this.reviewsMemo = { src: this.reviews, sort: this.reviewSort, n: this.reviewsShown, out: list.slice(0, this.reviewsShown) };
	}
	return this.reviewsMemo.out;
}

get reviewsAvg(): number {
	return this.reviews.length ? this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length : 0;
}

/** Call it every time cardIdCur changes (and when the page opens). */
reviewsLoad() {
	this.reviews = [];
	this.reviewsShown = 5;
	this.reviewRating = 0;
	this.reviewHover = 0;
	// TODO: fetch the reviews of this.cards[this.cardIdCur].module from backend and assign them to this.reviews
}

reviewSubmit(text: string) {
	const review = {
		id: Date.now(),
		author: this.global.session?.user?.name ?? "?",
		date: new Date().toISOString(),
		rating: this.reviewRating,
		text: text.trim()
	};
	this.reviews = [review, ...this.reviews];   // shown immediately
	this.reviewRating = 0;
	this.reviewHover = 0;
	// TODO: POST { module: this.cards[this.cardIdCur].module, rating: review.rating, text: review.text } to your backend
}

/** "2 days ago" in the language of the user. */
timeAgo(date: string): string {
	const s = (new Date(date).getTime() - Date.now()) / 1000;
	const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
	const rtf = new Intl.RelativeTimeFormat(this.global.settings?.lang || "en", { numeric: "auto" });
	for (const [unit, sec] of units)
		if (Math.abs(s) >= sec)
			return rtf.format(Math.round(s / sec), unit);
	return rtf.format(0, "second");
}

// ---------------------------------------------------------------- Similar apps (sidebar)
private relatedMemo: any = { id: -1, src: null, out: [] };

/** Same category as the current app, most starred first (max 8). Memoised on cardIdCur. */
get relatedCards(): any[] {
	if (this.relatedMemo.id !== this.cardIdCur || this.relatedMemo.src !== this.cards) {
		const cur = this.cards[this.cardIdCur];
		const out = cur ? this.cards
			.filter(c => c.module !== cur.module && c.category === cur.category && c.web)
			.sort((a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0))
			.slice(0, 8) : [];
		this.relatedMemo = { id: this.cardIdCur, src: this.cards, out };
	}
	return this.relatedMemo.out;
}

/** Click on a similar app: the same page is shown for that app. */
openApp(module: string) {
	const i = this.cards.findIndex(c => c.module === module);
	if (i < 0)
		return;
	this.cardIdCur = i;
	this.reviewsLoad();
	window.scrollTo({ top: 0, behavior: "smooth" });
}

}
