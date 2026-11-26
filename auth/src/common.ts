import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";

//Variables
const production = process.env.PRODUCTION === "true";
export const adminPath = (production ? "" : "../rootfs") + "/disk/admin/modules/";
export const frpPath = (production ? "" : "../rootfs") + "/usr/local/modules/frp/";
export const webPath = production ? "/usr/local/modules/_core_/web/" : "../client/src/";
export const appSocketPath = adminPath + "betterauth/app.sock";

//Functions
export function jsonRead(path: string) {
	try {
		return JSON.parse(readFileSync(path, "utf-8"));
	} catch (e) {
		return null;
	}
}

export function jsonWrite(el, path: string) {
	try {
		writeFileSync(path, JSON.stringify(el, null, "\t"), "utf-8");
	} catch (e) {
		console.error("jsonWrite: " + path, e);
	}
}

// Equivalent of cJSON_HasObjectItem
export function has(o, key: string): boolean {
	return o !== null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, key);
}

// Equivalent of (int)cJSON_GetNumberValue
export function num(v): number {
	return typeof v === "number" ? Math.trunc(v) : 0;
}

// Equivalent of cJSON_ArrayForEach: works on arrays and objects
export function children(el): any[] {
	if (Array.isArray(el))
		return el;
	return el !== null && typeof el === "object" ? Object.values(el) : [];
}

export function tab(n: number): string {
	return n == 2 ? "\t\t" : n == 1 ? "\t" : "";
}

// Equivalent of jsonPrintArray from app/json.c
export function printArray(tabN: number, before0: string, before1: string, sub: string, el, after: string): string {
	return children(el).map((s, i) => tab(tabN) + (i == 0 ? before0 : before1) + sub + (sub.length == 0 ? "" : ".") + s + after).join("");
}
