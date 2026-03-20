import { Injectable } from '@angular/core';

export interface Settings {
	lang: string,
	powerUser: boolean,
	tags: string[],
	dontShowAgain: string[],
	welcomeTourShown: boolean
}

export const Categories = {
	"Essential": {
		name: "Essential",
		icon: "star-outline",
		color: "yellow"
	},
	"Productivity": {
		name: "Productivity",
		icon: "attach-outline",
		color: "purple"
	},
	"Knowledge": {
		name: "Knowledge",
		icon: "information-circle-outline",
		color: "purple"
	},
	"Collaboration": {
		name: "Collaboration",
		icon: "share-social-outline",
		color: "purple"
	},
	"Personal": {
		name: "Personal",
		icon: "person-outline",
		color: "blue"
	},
	"Media": {
		name: "Media",
		icon: "play-outline",
		color: "blue"
	},
	"Torrent": {
		name: "Torrent",
		icon: "magnet-outline",
		color: "blue"
	},
	"Utils": {
		name: "Utils",
		icon: "hammer-outline",
		color: "cyan"
	},
	"Server": {
		name: "Server",
		icon: "cog-outline",
		color: "cyan"
	},
	"Developer": {
		name: "Developer",
		icon: "code-outline",
		color: "orange"
	},
	"Database": {
		name: "Database",
		icon: "server-outline",
		color: "orange"
	}
};

export const CategoriesEx = {
	...Categories,
	"AI": {
		name: "AI",
		icon: "bulb-outline",
		color: "black"
	},
	"Tag": {
		name: "Tag",
		icon: "bookmarks-outline",
		color: "black"
	},
	"All": {
		name: "All",
		icon: "apps-outline",
		color: "black"
	},
};

export const CategoriesBar = [
	{ separator:false, value:CategoriesEx["All"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["Essential"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["AI"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["Productivity"] },
	{ separator:false, value:CategoriesEx["Knowledge"] },
	{ separator:false, value:CategoriesEx["Collaboration"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["Personal"] },
	{ separator:false, value:CategoriesEx["Media"] },
	{ separator:false, value:CategoriesEx["Torrent"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["Utils"] },
	{ separator:false, value:CategoriesEx["Server"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["Developer"] },
	{ separator:false, value:CategoriesEx["Database"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["Tag"] }
];
