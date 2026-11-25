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
	this.route.queryParams.subscribe(params => this.queryInit(params));
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

queryInit(params) {
	if (params["name"])
		this.cardIdCur = this.global.modulesDataFindId(params["name"].toLowerCase());
	else
		this.cardIdCur = this.global.modulesDataFindId(Object.keys(params)[0].toLowerCase());
	this.reviewsLoad();
}

async ngOnInit() {
	if (this.global.session.user.role == "admin" && this.global.session.cloud.info.setup == "done1" && await this.global.presentQuestion("First-time setup", "Do you want to do the first-time setup of all modules?", "This takes around 5 minutes during which the system will be extremelly busy. After that, you will be able to use all the modules instantaneously.\nAlternatively, you can disregard this setup. You can either launch it later, meanwhile each module will be automatically set up during first use.", "firsttimesetup"))
		this.global.setup2Start(true);
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
reviewText = "";
reviewBusy = false;
private reviewsModule = "";
private reviewsMemo: any = { src: null, sort: "", n: -1, out: [] };

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

async reviewsLoad() {
	const module = this.cards[this.cardIdCur]?.module;
	if (!module || module === this.reviewsModule)
		return;
	this.reviewsModule = module;
	this.reviews = [];
	this.reviewsShown = 5;
	this.reviewRating = 0;
	this.reviewHover = 0;
	this.reviewText = "";
	try {
		const data = { method:"get", module };
		const ret = await this.httpClient.post(this.global.SERVERURL + "/master/review.json", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		// Ignore the answer if the user navigated to another module meanwhile
		if (module !== this.reviewsModule)
			return;
		this.reviews = ret["reviews"];
	} catch (err) {
		console.error("Reviews load failed:", err);
		if (module === this.reviewsModule)
			this.reviewsModule = ""; // allow a retry on next navigation
	}
}

async reviewSubmit() {
	const module = this.reviewsModule;
	const text = this.reviewText.trim();
	if (!module || !this.reviewRating || !text || this.reviewBusy)
		return;
	const data = {
		method: "put",
		module,
		cloud: this.global.session?.cloud?.info?.name ?? "",
		author: this.global.session?.user?.name || this.global.session?.user?.username || "",
		rating: this.reviewRating,
		text
	};
	this.reviewBusy = true;
	this.cdr.detectChanges();
	try {
		const ret = await this.httpClient.post(this.global.SERVERURL + "/master/review.json", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		if (module === this.reviewsModule && ret["review"]) {
			// The server keeps one review per author and module, so replace any previous one
			this.reviews = [ret["review"], ...this.reviews.filter(r => r.id !== ret["review"].id)];
			this.reviewRating = 0;
			this.reviewHover = 0;
			this.reviewText = "";
		}
	} catch (err) {
		console.error("Review submit failed:", err);
		this.global.presentToast(this.L(err?.status == 429 ? "Too many reviews, try again later." : "Your review could not be posted. Please try again."), "error");
	}
	this.reviewBusy = false;
	this.cdr.detectChanges();
}

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
