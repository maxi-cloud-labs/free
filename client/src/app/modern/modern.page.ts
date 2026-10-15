import { Component, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonModal } from '@ionic/angular';
import { JoyrideService } from 'ngx-joyride';
import { HttpClient } from '@angular/common/http';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { Global } from '../env';
import { CategoriesBar, Superset } from '../myinterface';
import { BleService } from '../ble';

@Component({
	selector: 'app-modern',
	templateUrl: './modern.page.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false
})

export class Modern {
L(st) { return this.global.mytranslate(st); }
LG(st) { return this.global.mytranslateG(st); }
LK(st) { return this.global.mytranslateK(st); }
LMT(st) { return this.global.mytranslateMT(st); }
LMD(st) { return this.global.mytranslateMD(st); }
@ViewChild(SidebarComponent) sidebarComponent;
@ViewChild("modalModuleInfo") modalModuleInfo: IonModal;
@ViewChild("modalModuleSettings") modalModuleSettings: IonModal;
@ViewChild("searchTermE") searchTermE: ElementRef;
@ViewChild("sidebar") sidebar: any;
cardIdCur = 0;
cardConfig;
cards = this.global.modulesData;
filteredCards = this.global.modulesData;
filteredGithubStars;
searchTerm: string = "";
sortProperty: string = "title";
sortDirection = { title:"asc", name:"asc", category:"asc" };
category: string = "All";
presentation: string = "cards";
showDetails: boolean = false;
showTerminal: boolean = true;
showDone: boolean = true;
showNotDone: boolean = false;
CategoriesBar = CategoriesBar;
Superset = Superset;

constructor(public global: Global, private cdr: ChangeDetectorRef, private httpClient: HttpClient, private joyrideService: JoyrideService, private route: ActivatedRoute, public ble: BleService) {
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
	const data1 = localStorage.getItem("sortPropertyModern");
	if (data1)
		this.sortProperty = data1;
	const data2 = localStorage.getItem("sortDirectionModern");
	if (data2)
		this.sortDirection = JSON.parse(data2);
	global.sidebarFilterType = "";
	this.filterCards();
	this.initModern();
}

ngAfterViewInit() {
	this.parseQuery();
}

parseQuery() {
	const sub = this.route.queryParams.subscribe(async (params) => {
		if (!this.cards || this.cards.length === 0) {
			setTimeout(() => { this.parseQuery(); }, 1000);
			return;
		}
		if (params["search"]) {
			this.searchTerm = params?.["search"];
			this.filterCards();
			this.cdr.detectChanges();
			if (params["settings"] === "true")
				this.settings(params["search"]);
		}
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
	this.sortCards();
	if (this.searchTerm != "" && this.searchTermE)
		this.searchTermE.nativeElement.focus();
}

filterCategory(c) {
	this.category =  this.category == c.value.name ? "All" : c.value.name;
	this.filterCards();
}

sortCards() {
	this.filteredCards.sort((a, b) => {
		const aValue = a[this.sortProperty];
		const bValue = b[this.sortProperty];
		return this.sortDirection[this.sortProperty] === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
	});
}

toggleSortDirection(p) {
	if (this.sortProperty == p)
		this.sortDirection[this.sortProperty] = this.sortDirection[this.sortProperty] === "asc" ? "desc" : "asc";
	this.sortProperty = p;
	this.sortCards();
	localStorage.setItem("sortPropertyModern", this.sortProperty);
	localStorage.setItem("sortDirectionModern", JSON.stringify(this.sortDirection));
}

tag(m) {
	this.cards[this.global.modulesDataFindId(m)]["tag"] = !this.cards[this.global.modulesDataFindId(m)]["tag"];
	this.global.settings.tags = this.cards.filter(card => card.tag === true).map(card => card.module);//.join("|");
	this.global.settingsSave();
	if (this.category == "Tag")
		this.filterCards();
	this.sidebarComponent.sidebarFilterCards();
}

firstWords(st) {
	const words = st.split(" ");
	return words.slice(0, -1).join(" ");
}

lastWord(st) {
	const words = st.split(" ");
	return words[words.length - 1];
}

async info(module) {
	this.cardIdCur = this.global.modulesDataFindId(module);
	await this.modalModuleInfo.present();
}

closeModuleInfo() {
	this.modalModuleInfo.dismiss();
}

async settings(module) {
	this.cardIdCur = this.global.modulesDataFindId(module);
	if (this.cards[this.cardIdCur].config)
		await this.config();
	await this.modalModuleSettings.present();
}

async moduleReset() {
	if (await this.global.presentQuestion("Reset \"" + this.cards[this.cardIdCur].title + "\" (" + this.cards[this.cardIdCur].name + ")", "WARNING! All data will be lost", "Are you sure to reset this module?"))
		if (await this.global.presentQuestion("Reset \"" + this.cards[this.cardIdCur].title + "\" (" + this.cards[this.cardIdCur].name + ")", "WARNING! All data will be lost", "This is your last chance. All data of this module will be erased and won't be recoverable. Are you absolutely sure to reset this module?")) {
			this.global.presentToast("The module '" + this.cards[this.cardIdCur].name + "' is being resetted. You will be notified of completion.", "info", {}, true);
			const data = { module:this.global.modulesData[this.cardIdCur].module };
			this.global.modulesData[this.cardIdCur]["notReady"] = 1;
			this.httpClient.post("/_app_/auth/module/reset", JSON.stringify(data), { headers:{ "content-type": "application/json" } }).toPromise();
			this.global.consolelog(2, "Auth module-reset");
			this.modalModuleSettings.dismiss();
		}
}

async moduleRefresh() {
	const data = { services:this.global.modulesData[this.cardIdCur].services };
	const ret = await this.httpClient.post("/_app_/auth/module/refresh", JSON.stringify(data), { headers:{ "content-type": "application/json" } }).toPromise();
	this.global.consolelog(2, "Auth module-refresh: ", ret);
	this.global.presentToast("The service associated to the module '" + this.cards[this.cardIdCur].name + "' has been restarted!", "success");
	this.modalModuleSettings.dismiss();
}

async config() {
	const data = { module:this.global.modulesData[this.cardIdCur].module };
	this.cardConfig = await this.httpClient.post("/_app_/auth/module/config", JSON.stringify(data), { headers:{ "content-type": "application/json" } }).toPromise();
	this.global.consolelog(2, "Auth module-config: ", this.cardConfig);
}

closeModuleSettings() {
	this.modalModuleSettings.dismiss();
}

ngOnInit() {
	if (!this.global.settings.welcomeTourShown && !this.global.developer) {
		setTimeout(() => {
			if (!this.global.settings.welcomeTourShown) {
				const steps = ["anchor1", "anchor2", "anchor3", "anchor4", "anchor5", "anchor6", "anchor7", "anchor8", "anchor9", "anchor10"];
				this.joyrideService.startTour({ steps }).subscribe( (step) => {}, (error) => {}, () => { setTimeout(() => {
					this.veryReady();
					this.global.settings.welcomeTourShown = true;
					this.global.settingsSave();
				}, 1000) } );
			}
		}, 1000);
	} else
		this.veryReady();
}

async veryReady() {
	if (this.global.session.user.role == "admin" && this.global.session.cloud.info.setup == "done1" && await this.global.presentQuestion("First-time setup", "Do you want to do the first-time setup of all modules?", "This takes around 5 minutes during which the system will be extremelly busy. After that, you will be able to use all the modules instantaneously.\nAlternatively, you can disregard this setup. You can either launch it later, meanwhile each module will be automatically set up during first use.", "firsttimesetup"))
		this.global.setup2Start(true);
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

helperQuery = "";
helperAsked = false;
helperBusy = false;
helperResults: any[] = [];

helperKey(e: Event, el: HTMLTextAreaElement) {
	if ((e as KeyboardEvent).shiftKey) return; // Shift+Enter = new line
	e.preventDefault();
	this.helperSend(el.value);
	el.value = '';
}
async helperSend(text: string) {
	const q = (text ?? '').trim();
	if (!q || this.helperBusy) return;
	this.helperQuery = q; this.helperAsked = true; this.helperBusy = true; this.helperResults = [];
	try { this.helperResults = await this.helperSearch(q); } catch { this.helperResults = []; }
	this.helperBusy = false;
}

protected async helperSearch(q: string): Promise<any[]> {
	const norm = (s: any) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	const stop = new Set(['the','and','for','with','that','this','want','need','use','app','apps','can','how','from','into','have','like','some','get','make','find','you','your','are','any','which','what','who','about','something','tool','please']);
	const stem = (t: string) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, '') : t);
	const tokens = norm(q).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !stop.has(t)).map(stem);
	if (!tokens.length) return [];
	return (this.cards ?? [])
		.map((c: any) => {
			const fields: [string, number][] = [
				[norm(this.LMT(c.title)), 4], [norm(c.name), 4], [norm((c.keywords ?? []).join(' ')), 3],
				[norm(c.proprietary), 3], [norm(c.category), 2], [norm(this.LMD(c.description)), 1],
			];
			let score = 0;
			for (const t of tokens) for (const [text, w] of fields) if (text.includes(t)) score += w;
			return { c, score };
		})
		.filter(x => x.score > 0)
		.sort((a, b) => b.score - a.score || (b.c.githubStars ?? 0) - (a.c.githubStars ?? 0))
		.slice(0, 3)
		.map(x => x.c);
}

showCategories = false;
heroes = ["openclaw", "n8n", "openwebui", "searxng", "homeassistant", "invidious"]; //Fixed heroes
heroTimer: any;
heroIdx = 0;
heroPaused = false;
helperClosed = false;
heroActive = false;
heroCards;
trendingCards;
trendingShownCards;
trendingIdx = 0;
TrendingNbPerScreen = 5;

heroKey(e, d) {
	const t = e.target as HTMLElement;
	if (!this.heroActive || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName) || t?.isContentEditable)
		return;
	this.heroPaused = true;
	this.heroStep(d);
}

heroStep(d) {
	const n = this.heroCards.length;
	this.heroIdx = (this.heroIdx + d + n) % n;
	this.cdr.detectChanges();
}

trendingStep(d) {
	const n = this.trendingCards.length;
	this.trendingIdx = (this.trendingIdx + d * this.TrendingNbPerScreen) % n;
	if (this.trendingIdx < 0)
		this.trendingIdx = n - 1;
	this.trendingIdx = Math.floor(this.trendingIdx / this.TrendingNbPerScreen) * this.TrendingNbPerScreen;
	this.trendingShownCards = this.trendingCards.slice(this.trendingIdx, this.trendingIdx + this.TrendingNbPerScreen);
	this.cdr.detectChanges();
}

initModern() {
	this.heroTimer = setInterval(() => { if (!this.heroPaused) this.heroStep(1); }, 10000);
	this.heroCards = [];
	for(let i = 0; i < this.heroes.length; i++)
		this.heroCards[i] = this.cards[this.global.modulesDataFindId(this.heroes[i])];
	this.trendingCards = this.cards.filter(c => c.web && (c.recommended || c.githubStars > 50000)).sort((a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0));
	this.trendingShownCards = this.trendingCards.slice(this.trendingIdx, this.trendingIdx + this.TrendingNbPerScreen);
}

floor(a) {
	return Math.floor(a);
}

ceil(a) {
	return Math.ceil(a);
}

}

@Pipe({
  name: 'filterByCategories',
  standalone: false
})
export class FilterByCategoriesPipe implements PipeTransform {
transform(cards: any[], categories: string[]): any[] {
	const categorySet = new Set(categories);
	return cards.filter(card => categorySet.has(card.category));
}

}
