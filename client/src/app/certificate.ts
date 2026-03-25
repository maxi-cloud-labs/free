import { ACME_DIRECTORY_URLS, AcmeClient, AcmeOrder, CryptoKeyUtils } from "@fishballpkg/acme";

export class Certificate {
static SERVERURL: string = "https://maxi.cloud";
static developer = false;

constructor() {}

static consolelog(level, ...st) {
	if (level == 0 || this.developer)
		console.log(...st);
}

static async sleepms(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

static async process(production, developer, name, shortname, customDomain) {
	this.developer = developer;
	const ret = { privateKey:"", fullChain:"" };
	const data = {};
	const domains = [ name + ".maxi.cloud", "*." + name + ".maxi.cloud", shortname + ".maxi.cloud", "*." + shortname + ".maxi.cloud" ];
	if (customDomain && customDomain != "") {
		domains.push(customDomain);
		domains.push("*." + customDomain);
	}
	const url = production ? ACME_DIRECTORY_URLS.LETS_ENCRYPT : ACME_DIRECTORY_URLS.LETS_ENCRYPT_STAGING;
	this.consolelog(1, "CERTIFICATE: Url", url);
	try {
		const client = await AcmeClient.init(url);
		const account = await client.createAccount({ emails: ["acme@maxi.cloud"] });
		const order = await account.createOrder({ domains });
		const dns01Challenges = order.authorizations.map((authorization) => {
			return authorization.findDns01Challenge();
		});
		const expectedRecords = await Promise.all(
			dns01Challenges.map(async (challenge) => {
				if (challenge !== undefined) {
					const txtRecordContent = await challenge.digestToken();
					(data[challenge.authorization.domain.replace("*.", "")] ??= []).push(txtRecordContent);
				}
				return true;
			})
		);
		this.consolelog(1, "CERTIFICATE: Data", data);
		const responseA = await fetch(this.SERVERURL + "/master/setup-set-dnsrecords.json", { method:"POST", headers:{ "content-type":"application/x-www-form-urlencoded" }, body:"add=1&v=" + encodeURIComponent(JSON.stringify(data)) });
		const retA = await responseA.json();
		this.consolelog(1, "CERTIFICATE: Add", retA);
		await this.sleepms(5000);
		dns01Challenges.map(async (challenge) => {
			await challenge?.submit()
		});
		this.consolelog(1, "CERTIFICATE: PollStatus");
		await order.pollStatus({
			pollUntil: "ready",
			onBeforeAttempt: () => {},
			onAfterFailAttempt: () => { this.consolelog(1, "CERTIFICATE: After fail attempt"); }
		});
		this.consolelog(1, "CERTIFICATE: Finalize");
		const certKeyPair = await order.finalize();
		await order.pollStatus({ pollUntil: "valid" });
		const key = await CryptoKeyUtils.exportKeyPairToPem(certKeyPair);
		ret.privateKey = key.privateKey;
		ret.fullChain = await order.getCertificate();
	} catch(e) { this.consolelog(0, "CERTIFICATE: ERROR", e); }
	this.consolelog(1, "CERTIFICATE: Ret", ret);
	const responseD = await fetch(this.SERVERURL + "/master/setup-set-dnsrecords.json", { method:"POST", headers:{ "content-type":"application/x-www-form-urlencoded" }, body:"del=1&v=" + encodeURIComponent(JSON.stringify(data)) });
	const retD = await responseD.json();
	this.consolelog(1, "CERTIFICATE: Del", retD);
	return ret;
}

}
