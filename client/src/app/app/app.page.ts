import { Component, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
@ViewChild("modernbar") modernbar: any;
cardIdCur = 0;
cardConfig;
cards = this.global.modulesData;
category: string = "All";
presentation: string = "cards";
CategoriesBar = CategoriesBar;
CategoriesOrg = CategoriesOrg;

constructor(public global: Global, private cdr: ChangeDetectorRef, private httpClient: HttpClient, private route: ActivatedRoute, public ble: BleService) {
	global.refreshUI.subscribe(event => {
		if (event === "onlybar")
			this.modernbar.refresh();
		else if (event === "refresh")
			this.cdr.detectChanges();
		else if (event === "reset") {
			if (this.modernbar.searchTerm != "" || this.category != "All") {
				this.modernbar.searchTerm = "";
				this.category = "All";
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
		if (params["name"])
			this.cardIdCur = this.global.modulesDataFindId(params["name"]);
		this.cdr.detectChanges();
	});
}

async ngOnInit() {
	if (this.global.session.user.role == "admin" && this.global.session.cloud.info.setup == "done1" && await this.global.presentQuestion("First-time setup", "Do you want to do the first-time setup of all modules?", "This takes around 5 minutes during which the system will be extremelly busy. After that, you will be able to use all the modules instantaneously.\nAlternatively, you can disregard this setup. You can either launch it later, meanwhile each module will be automatically set up during first use.", "firsttimesetup"))
		this.global.setup2Start(true);
	this.pageInit();
}

floor(a) {
	return Math.floor(a);
}








async moduleRefresh() {}

async moduleReset() {}

get relatedCards(): any[] {
	const cur = this.cards[this.cardIdCur];
	const out = cur ? this.cards.filter(c => c.module !== cur.module && c.category === cur.category && c.web).sort((a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0)).slice(0, 8) : [];
	return out;
}

reviews: any[] = []; // [{ id, author, date (ISO string), rating (1-5), text }]
reviewSort = "newest"; // newest | oldest | top
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

}
