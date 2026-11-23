import { Component } from '@angular/core';
import { Global } from '../env';

@Component({
	selector: 'app-pricing',
	templateUrl: 'pricing.page.html',
	standalone: false
})

export class Pricing {
L(st) { return this.global.mytranslate(st); }
LG(st) { return this.global.mytranslateG(st); }

billingPeriod: "month" | "year" = "month";

constructor(public global: Global) {}

setBillingPeriod(period: "month" | "year") {
	this.billingPeriod = period;
}

priceFor(product: "plus" | "boost" | "home") {
	if (product == "home")
		return "$500.00";
	if (product == "boost")
		return this.billingPeriod == "year" ? "$250.00" : "$25.00";
	return this.billingPeriod == "year" ? "$100.00" : "$10.00";
}

discountLabel() {
	return this.billingPeriod == "year" ? "17%" : "0%";
}

}
