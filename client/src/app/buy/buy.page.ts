import { Component, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { loadStripe, Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { Global } from '../env';

@Component({
	selector: 'app-buy',
	templateUrl: 'buy.page.html',
	standalone: false
})

export class Buy {
L(st) { return this.global.mytranslate(st); }
LG(st) { return this.global.mytranslateG(st); }

@ViewChild("paymentElement") paymentElementRef: ElementRef;

private readonly stripePromise = loadStripe("pk_test_51MTM0rDTgwXVeojftGj8HXobJwGMdINGrVir7kv2rmqbZ13SEJKhb6GjAvxup9C6bDjsIJfhjJbH82t2vudxXHFK00uFlpKusW");
private stripe: Stripe | null = null;
private elements: StripeElements | null = null;
private paymentElement: StripePaymentElement | null = null;
private clientSecret: string | null = null;
products = [
	{ id:"maxiplus", name:this.L("mAxI Plus"), description:this.L("Premium storage and CPU"), monthTotal:10, yearTotal:100 },
	{ id:"maxiboost", name:this.L("mAxI Boost"), description:this.L("All Plus and AI booster"), monthTotal:25, yearTotal:250 }
];
selectedProduct = this.products[0].id;
billingPeriod: "month" | "year" = "month";
progress = false;
paymentReady = false;
paymentComplete = false;
errorSt: string | null = null;

constructor(public global: Global, private cdr: ChangeDetectorRef, private route: ActivatedRoute, private router: Router, private httpClient: HttpClient) {
	this.route.queryParams.subscribe(params => { this.initialize(params["product"], params["period"] ); });
}

async initialize(productParam: string | null, periodParam: string | null) {
	this.progress = true;
	try {
		this.stripe = await this.stripePromise;
		if (!this.stripe) throw new Error(this.L("Stripe could not be initialized. Please try again."));
		this.billingPeriod = periodParam == "year" ? "year" : "month";
		if (productParam) {
			const product = this.products.find(item => item.id.includes(productParam.toLowerCase()));
			if (!product) throw new Error(this.L("The requested product was not found."));
			this.selectedProduct = product.id;
		}
		this.progress = false;
		if (new URLSearchParams(window.location.search).has("payment_intent_client_secret"))
			await this.checkRedirectResult();
		else
			await this.startCheckout();
	} catch (error) {
		this.progress = false;
		this.errorSt = error?.message || this.L("Payment could not be prepared. Please try again.");
		this.cdr.detectChanges();
	}
}

get selectedPrice() {
	const product = this.products.find(item => item.id == this.selectedProduct);
	return product ? this.formatPrice(this.billingPeriod == "year" ? product.yearTotal : product.monthTotal) : "";
}

get discount() {
	return this.billingPeriod == "year" ? "17%" : "0%";
}

formatPrice(price: number) {
	return "$" + price.toFixed(2);
}

productPrice(product) {
	return this.formatPrice(this.billingPeriod == "year" ? product.yearTotal : product.monthTotal);
}

setBillingPeriod(period: "month" | "year") {
	if (this.billingPeriod == period) return;
	this.paymentElement?.unmount();
	this.paymentElement = null;
	this.elements = null;
	this.clientSecret = null;
	this.paymentReady = false;
	this.paymentComplete = false;
	this.errorSt = null;
	this.billingPeriod = period;
	this.router.navigate([], { relativeTo: this.route, queryParams: { period }, queryParamsHandling: "merge", replaceUrl: true });
	this.startCheckout();
}

async checkRedirectResult() {
	const clientSecret = new URLSearchParams(window.location.search).get("payment_intent_client_secret");
	if (!clientSecret) return;
	this.progress = true;
	try {
		const stripe = this.stripe || await this.stripePromise;
		const result = await stripe.retrievePaymentIntent(clientSecret);
		if (result.error) this.errorSt = result.error.message || this.L("Payment status could not be checked.");
		else if (result.paymentIntent?.status == "succeeded" || result.paymentIntent?.status == "processing") this.paymentComplete = true;
		else this.errorSt = this.L("Payment was not completed. Please try again.");
	} catch (error) {
		this.errorSt = error?.message || this.L("Payment status could not be checked.");
	} finally {
		this.progress = false;
		this.cdr.detectChanges();
	}
}

selectProduct(productId: string) {
	if (this.selectedProduct == productId) return;
	this.paymentElement?.unmount();
	this.paymentElement = null;
	this.elements = null;
	this.clientSecret = null;
	this.paymentReady = false;
	this.paymentComplete = false;
	this.errorSt = null;
	this.selectedProduct = productId;
	this.startCheckout();
}

retryPaymentSetup() {
	this.initialize(this.route.snapshot.queryParamMap.get("product"), this.route.snapshot.queryParamMap.get("period"));
}

async startCheckout() {
	if (this.progress || !this.selectedProduct) return;
	this.progress = true;
	this.errorSt = null;
	try {
		const stripe = this.stripe || await this.stripePromise;
		const product = this.products.find(item => item.id == this.selectedProduct);
		if (!product) throw new Error(this.L("The requested product was not found."));
		const intent = await this.httpClient.post<{ id: string, client_secret: string }>("https://maxi.cloud/master/buy_prepare.html", {
			total: this.billingPeriod == "year" ? product.yearTotal : product.monthTotal
		}, { headers: { "content-type": "application/json" } }).toPromise();
		if (!intent?.client_secret) throw new Error(this.L("Payment could not be prepared. Please try again."));
		this.clientSecret = intent.client_secret;
		this.elements = stripe.elements({ clientSecret: intent.client_secret, appearance: { theme: "night" } });
		this.paymentReady = true;
		this.cdr.detectChanges();
		this.paymentElement = this.elements.create("payment", {
			paymentMethodOrder: ["card", "us_bank_account", "klarna", "cashapp"],
			layout: "tabs"
		});
		if (!this.paymentElementRef?.nativeElement) throw new Error(this.L("Payment form could not be loaded. Please try again."));
		this.paymentElement.mount(this.paymentElementRef.nativeElement);
	} catch (error) {
		this.errorSt = error?.error?.message || error?.message || this.L("Checkout could not be started. Please try again.");
	} finally {
		this.progress = false;
		this.cdr.detectChanges();
	}
}

async pay() {
	if (this.progress || !this.stripe || !this.elements || !this.clientSecret) return;
	this.progress = true;
	this.errorSt = null;
	try {
alert(this.selectedProduct);
		const result = await this.stripe.confirmPayment({
			elements: this.elements,
			confirmParams: { return_url: window.location.origin + "/buy?product=" + this.selectedProduct + "&period=" + this.billingPeriod + "&payment=complete" },
			redirect: "if_required"
		});
		if (result.error) this.errorSt = result.error.message || this.L("Payment could not be completed. Please try again.");
		else if (result.paymentIntent?.status == "succeeded") this.paymentComplete = true;
		else if (result.paymentIntent?.status == "processing") this.paymentComplete = true;
		else this.errorSt = this.L("Payment was not completed. Please try again.");
	} catch (error) {
		this.errorSt = error?.message || this.L("Payment could not be completed. Please try again.");
	} finally {
		this.progress = false;
		this.cdr.detectChanges();
	}
}

}
