import { Injectable } from '@angular/core';

export interface Settings {
	lang: string,
	powerUser: boolean,
	tags: string[],
	dontShowAgain: string[],
	welcomeTourShown: boolean
}

export const Categories = {
	"AI Generative": {
		name: "AI Generative",
		icon: "bulb-outline",
		color: "lime"
	},
	"AI Agentic": {
		name: "AI Agentic",
		icon: "bulb-outline",
		color: "lime"
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
		color: "teal"
	},
	"Media": {
		name: "Media",
		icon: "play-outline",
		color: "teal"
	},
	"Torrent": {
		name: "Torrent",
		icon: "magnet-outline",
		color: "teal"
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

export const CategoriesOrg = {
	"AI": { name:"AI", color:"lime", "categories":["AI Generative", "AI Agentic"] },
	"Work": { name:"Work", color:"purple", "categories":["Productivity", "Knowledge", "Collaboration"] },
	"Entertainment": { name:"Entertainment", color:"teal", "categories":["Personal", "Media", "Torrent"] },
	"Infrastructure": { name:"Infrastructure", color:"cyan", "categories":["Utils", "Server"] },
	"Development": { name:"Development", color:"orange", "categories":["Developer", "Database"] }
};

export const CategoriesEx = {
	...Categories,
	"Recommended": {
		name: "Recommended",
		icon: "star-outline",
		color: "yellow"
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
	{ separator:false, value:CategoriesEx["Recommended"] },
	{ separator:true },
	{ separator:false, value:CategoriesEx["AI Generative"] },
	{ separator:false, value:CategoriesEx["AI Agentic"] },
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
