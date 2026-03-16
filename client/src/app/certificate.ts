import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ACME_DIRECTORY_URLS, AcmeClient, AcmeOrder, CryptoKeyUtils } from "@fishballpkg/acme";
import { Global } from './env';

@Injectable({
	providedIn: "root"
})

export class Certificate {
SERVERURL: string = "https://maxi.cloud";

constructor(private global: Global, private httpClient: HttpClient) {}

async process(production, name, shortname, customDomain) {
	const ret = { privateKey:"", fullChain:"" };
	const data = {};
	const domains = [ name + ".maxi.cloud", "*." + name + ".maxi.cloud", shortname + ".maxi.cloud", "*." + shortname + ".maxi.cloud" ];
	if (customDomain && customDomain != "") {
		domains.push(customDomain);
		domains.push("*." + customDomain);
	}
	const url = production ? ACME_DIRECTORY_URLS.LETS_ENCRYPT : ACME_DIRECTORY_URLS.LETS_ENCRYPT_STAGING;
	this.global.consolelog(1, "CERTIFICATE: Url", url);
try {
	const client = await AcmeClient.init(url);
	const account = await client.createAccount({ emails: ["acme@maxi.cloud"] });
	const order = await account.createOrder({ domains });
	const dns01Challenges = order.authorizations.map((authorization) => {
		return authorization.findDns01Challenge();
	});
	const expectedRecords = await Promise.all(
		dns01Challenges.map(async (challenge) => {
			const txtRecordContent = await challenge.digestToken();
			(data[challenge.authorization.domain.replace("*.", "")] ??= []).push(txtRecordContent);
			return true;
		})
	);
	this.global.consolelog(1, "CERTIFICATE: Data", data);
	const retA = await this.httpClient.post(this.SERVERURL + "/master/setup-certificate.json", "add=1&v=" + encodeURIComponent(JSON.stringify(data)), { headers:{ "content-type":"application/x-www-form-urlencoded" } }).toPromise();
	this.global.consolelog(1, "CERTIFICATE: Add", retA);
	await this.global.sleepms(5000);
	dns01Challenges.map(async (challenge) => {
		await challenge.submit()
	});
	this.global.consolelog(1, "CERTIFICATE: PollStatus");
	await order.pollStatus({
		pollUntil: "ready",
		onBeforeAttempt: () => {},
		onAfterFailAttempt: () => { this.global.consolelog(1, "CERTIFICATE: After fail attempt"); }
	});
	this.global.consolelog(1, "CERTIFICATE: Finalize");
	const certKeyPair = await order.finalize();
	await order.pollStatus({ pollUntil: "valid" });
	const key = await CryptoKeyUtils.exportKeyPairToPem(certKeyPair);
	ret.privateKey = key.privateKey;
	ret.fullChain = await order.getCertificate();
} catch(e) { this.global.consolelog(0, "CERTIFICATE: ERROR", e); }
	this.global.consolelog(1, "CERTIFICATE: Ret", ret);
	const retD = await this.httpClient.post(this.SERVERURL + "/master/setup-certificate.json", "del=1&v=" + encodeURIComponent(JSON.stringify(data)), { headers:{ "content-type":"application/x-www-form-urlencoded" } }).toPromise();
	this.global.consolelog(1, "CERTIFICATE: Del", retD);
	return ret;
}

}
