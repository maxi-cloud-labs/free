import { Component, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { Pipe, PipeTransform } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
@ViewChild("modernbar") modernbar: any;
cardIdCur = 0;
cardConfig;
cards = this.global.modulesData;
CategoriesOrg = CategoriesOrg;
CategoriesVisible = [];
CategoriesVisibleAll = true;

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

helperShown = true;
helperAsked = false;
helperBusy = false;
helperRequestId = 0;
helperQuery;
helperAnswer = "";
helperResults = [];
helperMessages: { role:string; content:string }[] = [];
helper2Abort?: AbortController;

helperKey(e: Event, el: HTMLTextAreaElement) {
	const event = e as KeyboardEvent;
	if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
		event.preventDefault();
		const value = el.value.trim();
		if (!value || this.helperBusy)
			return;
		el.value = "";
		void this.helperSend(value);
	}
}

async helperSend(query: string) {
	this.helperQuery = query.trim();
	this.helperAsked = true;
	this.helperBusy = true;
	this.helperAnswer = "";
	this.helperResults = [];
	const requestId = ++this.helperRequestId;
	const messages = [...this.helperMessages.slice(-8), { role:"user", content:query }];
	const data = { messages };
	try {
		const token = this.global.session.sessionID;
		const ret = await this.httpClient.post(this.global.SERVERURL + "/master/helper.json", JSON.stringify(data), { headers:{ "Content-Type": "application/json", "Authorization": "Bearer " + token } }).toPromise();
		if (requestId != this.helperRequestId)
			return;
		this.helperResults = ret["apps"].map(name => this.cards[this.global.modulesDataFindId(name)]);
		this.helperAnswer = ret["answer"];
	} catch (err) {
		console.error("App Finder failed:", err);
		if (requestId !== this.helperRequestId)
			return;
		this.helperResults = this.helperSearchFallback(query);
		this.helperAnswer = "I found those apps.";
	} finally {
		this.helperBusy = false;
		this.helperMessages = [...messages, { role:"assistant", content:JSON.stringify({ apps:this.helperResults.map(c => c.name), answer:this.helperAnswer }) }];
		this.cdr.detectChanges();
	}
}

helper2PreviewAnswer(raw: string): string {
	const match = /"answer"\s*:\s*"/.exec(raw);
	if (!match)
		return "";
	const start = match.index + match[0].length;
	let end = start;
	while (end < raw.length) {
		if (raw[end] === "\\") {
			if (end + 1 >= raw.length)
				break;
			if (raw[end + 1] === "u") {
				if (!/^[0-9a-f]{4}$/i.test(raw.slice(end + 2, end + 6)))
					break;
				end += 6;
				continue;
			}
			end += 2;
			continue;
		}
		if (raw[end] === '"')
			break;
		end++;
	}
	try {
		return JSON.parse('"' + raw.slice(start, end) + '"');
	} catch {
		return "";
	}
}

helper2PreviewApps(raw: string): string[] {
	const match = /"apps"\s*:\s*\[/.exec(raw);
	if (!match)
		return [];
	const apps: string[] = [];
	let pos = match.index + match[0].length;
	while (pos < raw.length) {
		while (pos < raw.length && /[\s,]/.test(raw[pos]))
			pos++;
		if (raw[pos] !== '"')
			break;
		const start = pos++;
		while (pos < raw.length) {
			if (raw[pos] === "\\") {
				pos += 2;
				continue;
			}
			if (raw[pos] === '"')
				break;
			pos++;
		}
		if (pos >= raw.length)
			break;
		try {
			apps.push(JSON.parse(raw.slice(start, ++pos)));
		} catch {
			break;
		}
	}
	return apps;
}

async helper2Send(query: string) {
	this.helper2Abort?.abort();
	this.helperQuery = query.trim();
	this.helperAsked = true;
	this.helperBusy = true;
	this.helperAnswer = "";
	this.helperResults = [];
	const requestId = ++this.helperRequestId;
	const messages = [...this.helperMessages.slice(-8), { role:"user", content:query }];
	const abort = new AbortController();
	this.helper2Abort = abort;
	const applyApps = (apps: string[]) => {
		this.helperResults = apps.map(name => this.cards[this.global.modulesDataFindId(name)]).filter(Boolean);
	};
	const applyResult = (ret: { apps:string[]; answer:string }) => {
		applyApps(ret.apps);
		this.helperAnswer = ret.answer;
		this.cdr.detectChanges();
	};
	try {
		const response = await fetch(this.global.SERVERURL + "/master/helper2.json", { method:"POST", headers:{ "Content-Type":"application/json", "Authorization":"Bearer " + this.global.session.sessionID }, body:JSON.stringify({ messages }), signal:abort.signal});
		if (!response.ok)
			throw new Error("HTTP " + response.status);
		if (requestId != this.helperRequestId)
			return;
		const contentType = response.headers.get("Content-Type") || "";
		if (!contentType.includes("application/x-ndjson")) {
			const ret = await response.json();
			if (requestId != this.helperRequestId)
				return;
			if (!Array.isArray(ret.apps) || typeof ret.answer !== "string")
				throw new Error("Invalid response");
			applyResult(ret);
		} else {
			if (!response.body)
				throw new Error("Missing response body");
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let raw = "";
			let completed = false;
			let lastApps: string[] = [];
			const processLine = (line: string) => {
				if (!line.trim() || requestId != this.helperRequestId)
					return;
				const event = JSON.parse(line);
				if (event.type === "error")
					throw new Error(event.message || "AI generation failed");
				if (event.type === "delta" || event.type === "reset") {
					raw = event.type === "reset" ? (event.text || "") : raw + (event.text || "");
					const apps = this.helper2PreviewApps(raw);
					if (apps.length !== lastApps.length || apps.some((name, i) => name !== lastApps[i])) {
						lastApps = apps;
						applyApps(apps);
					}
					this.helperAnswer = this.helper2PreviewAnswer(raw);
					this.cdr.detectChanges();
				} else if (event.type === "done") {
					if (!Array.isArray(event.apps) || typeof event.answer !== "string")
						throw new Error("Invalid result");
					applyResult(event);
					completed = true;
				}
			};
			while (true) {
				const { value, done } = await reader.read();
				if (done)
					break;
				buffer += decoder.decode(value, { stream:true });
				let pos: number;
				while ((pos = buffer.indexOf("\n")) !== -1) {
					processLine(buffer.slice(0, pos));
					buffer = buffer.slice(pos + 1);
				}
			}
			buffer += decoder.decode();
			if (buffer.trim())
				processLine(buffer);
			if (!completed)
				throw new Error("Streaming response ended early");
		}
	} catch (err) {
		if (requestId != this.helperRequestId)
			return;
		console.error("App Finder failed:", err);
		this.helperResults = this.helperSearchFallback(query);
		this.helperAnswer = "I found those apps.";
	} finally {
		abort.abort();
		if (requestId === this.helperRequestId) {
			this.helperBusy = false;
			this.helper2Abort = undefined;
			this.helperMessages = [...messages, {
				role:"assistant",
				content:JSON.stringify({
					apps:this.helperResults.map(c => c.name),
					answer:this.helperAnswer
				})
			}];
			this.cdr.detectChanges();
		}
	}
}

helperSearchFallback(q: string) {
	const norm = (s: any) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	const stop = new Set(["the","and","for","with","that","this","want","need","use","app","apps","can","how","from","into","have","like","some","get","make","find","you","your","are","any","which","what","who","about","something","tool","please"]);
	const stem = (t: string) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, "") : t);
	const tokens = norm(q).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !stop.has(t)).map(stem);
	if (!tokens.length)
		return [];
	return this.cards.map((c) => {
		const fields: [string, number][] = [
			[norm(this.LMT(c.title)), 4],
			[norm(c.name), 4],
			[norm((c.keywords ?? []).join(" ")), 3],
			[norm(c.proprietary), 3],
			[norm(c.category), 2],
			[norm(this.LMD(c.description)), 1]
		];
		let score = 0;
		for (const t of tokens)
			for (const [text, w] of fields)
				if (text.includes(t))
					score += w;
		return { ...c, score };
	}).filter(x => x.score > 0).sort((a, b) => b.score - a.score || (b.githubStars ?? 0) - (a.githubStars ?? 0)).slice(0, 3);
}

heroIdx = 0;
heroPaused = false;
heroCards = [];
heroProgressKey = 0;

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
	const editorPick = {
		all: ["openclaw", "openwebui", "searxng", "homeassistant", "jellyfin", "stirlingpdf", "mastodon"],
		AI: ["openclaw", "ollama", "dify", "openwebui", "comfyui", "anythingllm", "khoj"],
		Work: ["excalidraw", "stirlingpdf", "affine", "joplin", "paperlessngx", "outline", "jitsimeet"],
		Entertainment: ["immich", "homeassistant", "jellyfin", "qbittorrent", "searxng", "actualbudget", "navidrome"],
		Infrastructure: ["uptimekuma", "syncthing", "vaultwarden", "pihole", "ntfy", "homepage", "convertx"],
		Development: ["gitea", "appsmith", "swaggerui", "shields", "adminer", "sqliteweb", "pgadmin4"]
	}
	if (arg === undefined)
		arg = "all"
	if (editorPick[arg] !== undefined)
		this.heroCards = editorPick[arg].map(hero => this.cards[this.global.modulesDataFindId(hero)]);
	else {
		let cats = [];
		for(let i = 0; i < CategoriesOrg.length; i++)
			if (CategoriesOrg[i]["name"] == arg)
				cats = CategoriesOrg[i].categories;
		this.heroCards = this.cards.filter(c => c.web && (arg == c.category || cats.includes(c.category))).sort((a, b) => (b.githubStars ?? 0) - (a.githubStars ?? 0)).slice(0, 7);
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
