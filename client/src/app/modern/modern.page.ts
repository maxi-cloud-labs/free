import { Component, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ModernbarComponent } from '../components/modernbar/modernbar.component';
import { Global } from '../env';
import { CategoriesOrg } from '../myinterface';
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
@ViewChild(ModernbarComponent) modernbarComponent;
@ViewChild("modernbar") modernbar: any;
cardIdCur = 0;
cardConfig;
cards = this.global.modulesData;
CategoriesOrg = CategoriesOrg;
CategoriesVisible = [];
CategoriesVisibleAll = true;
helperShown = true;
helperQuery = "";
helperAsked = false;
helperRequestId = 0;
helperBusy = false;
helperResults: any[] = [];
heroIdx = 0;
heroPaused = false;
heroCards = [];
heroProgressKey = 0;

constructor(public global: Global, private cdr: ChangeDetectorRef, private httpClient: HttpClient, private route: ActivatedRoute, public ble: BleService) {
	global.refreshUI.subscribe(event => {
		if (event === "onlybar")
			this.modernbar.refresh();
		else if (event === "refresh")
			this.cdr.detectChanges();
		else if (event === "reset") {
			if (this.modernbar.searchTerm != "" || this.modernbar.category != "All") {
				this.modernbar.searchTerm = "";
				this.modernbar.category = "All";
				this.modernbar.filterCards();
				this.cdr.detectChanges();
			}
		}
		else if (event === "modules") {
			this.modernbar.filterCards();
			this.cdr.detectChanges();
		}
	});
	global.sidebarFilterType = "";
}

pageInit() {
	const sub = this.route.queryParams.subscribe(async (params) => {
		if (params["category"]) {
			this.CategoriesVisible = [];
			for(let i = 0; i < CategoriesOrg.length; i++)
				if (CategoriesOrg[i]["name"] == params?.["category"]) {
					for(let ii = 0; ii < CategoriesOrg[i]["categories"].length; ii++)
						this.CategoriesVisible[ii] = { name:CategoriesOrg[i]["categories"][ii], categories:[CategoriesOrg[i]["categories"][ii]] };
					break;
				} else {
					for(let ii = 0; ii < CategoriesOrg[i]["categories"].length; ii++)
						if (CategoriesOrg[i]["categories"][ii] == params?.["category"]) {
							this.CategoriesVisible[0] = { name:CategoriesOrg[i]["categories"][ii], categories:[CategoriesOrg[i]["categories"][ii]] };
							break;
						}
				}
			this.CategoriesVisibleAll = false;
		} else {
			this.CategoriesVisible = CategoriesOrg;
			this.CategoriesVisibleAll = true;
		}
		this.helperShown = this.CategoriesVisibleAll;
		window.scrollTo({ top:0, behavior:"smooth" });
		this.heroInit(params["category"]);
		this.trendingInit();
		this.cdr.detectChanges();
	});
}

async ngOnInit() {
	if (this.global.session.user.role == "admin" && this.global.session.cloud.info.setup == "done1" && await this.global.presentQuestion("First-time setup", "Do you want to do the first-time setup of all modules?", "This takes around 5 minutes during which the system will be extremelly busy. After that, you will be able to use all the modules instantaneously.\nAlternatively, you can disregard this setup. You can either launch it later, meanwhile each module will be automatically set up during first use.", "firsttimesetup"))
		this.global.setup2Start(true);
	this.pageInit();
}

helperKey(e: Event, el: HTMLTextAreaElement) {
	if ((e as KeyboardEvent).shiftKey) return;
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

heroProgressTrack(_index, key) {
	return key;
}

heroKey(e, d) {
    const t = e.target as HTMLElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName) || t?.isContentEditable)
        return;
    this.heroStep(d);
}

heroStep(d) {
    const n = this.heroCards.length;
    this.heroIdx = (this.heroIdx + d + n) % n;
    this.heroProgressKey ^= 1;
    this.heroPaused = false;
    this.cdr.detectChanges();
}

heroInit(arg) {
	if (arg !== undefined) {
		let cats = [];
		for(let i = 0; i < CategoriesOrg.length; i++)
			if (CategoriesOrg[i]["name"] == arg)
				cats = CategoriesOrg[i].categories;
		this.heroCards = this.cards.filter(c => c.web && (arg == c.category || cats.includes(c.category))).sort((a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0)).slice(0, 7);
	} else {
		const heroes = ["openclaw", "n8n", "openwebui", "searxng", "homeassistant", "invidious", "mastodon"];
		this.heroCards = heroes.map(hero => this.cards[this.global.modulesDataFindId(hero)]);
	}
	this.heroIdx = 0;
	this.heroProgressKey = 0;
	this.heroPaused = false;
}

heroSelect(i) {
    this.heroIdx = i;
    this.heroProgressKey ^= 1;
    this.heroPaused = false;
    this.cdr.detectChanges();
}

trendingCards = [];
trendingShownCards;
trendingIdx = 0;
TrendingNbPerScreen = 5;

trendingStep(d) {
	const n = this.trendingCards.length;
	this.trendingIdx = (this.trendingIdx + d * this.TrendingNbPerScreen) % n;
	if (this.trendingIdx < 0)
		this.trendingIdx = n - 1;
	this.trendingIdx = Math.floor(this.trendingIdx / this.TrendingNbPerScreen) * this.TrendingNbPerScreen;
	this.trendingShownCards = this.trendingCards.slice(this.trendingIdx, this.trendingIdx + this.TrendingNbPerScreen);
	this.cdr.detectChanges();
}

trendingInit() {
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

export interface HelperResponse {
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
}


@Pipe({
  name: "filterByCategories",
  standalone: false
})
export class FilterByCategoriesPipe implements PipeTransform {
transform(cards: any[], categories: string[]): any[] {
	const categorySet = new Set(categories);
	return cards.filter(card => categorySet.has(card.category));
}

}
