import { Component, AfterViewInit, ViewChildren, ViewChild, QueryList, ElementRef, ChangeDetectorRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Global } from '../env';

@Component({
	selector: 'app-login',
	templateUrl: 'login.page.html',
	standalone: false
})

export class Login implements AfterViewInit {
L(st) { return this.global.mytranslate(st); }
@ViewChildren("otpInputE") otpInputs: QueryList<ElementRef>;
@ViewChild("email1E") email1E: ElementRef;
@ViewChild("password1E") password1E: ElementRef;
@ViewChild("submit1E") submit1E: ElementRef;
@ViewChild("name2E") name2E: ElementRef;
@ViewChild("email3E") email3E: ElementRef;
@ViewChild("submit4E") submit4E: ElementRef;
password1Show:boolean = false;
password2Show:boolean = false;
ready:boolean = false;
progress:boolean = false;
showLogin:boolean = true;
showOtp:boolean = false;
showRegister:boolean = false;
showForgotPassword: boolean = false;
showForgotPasswordSent: boolean = false;
formLogin: FormGroup;
formRegister: FormGroup;
formForgotPassword: FormGroup;
formOtp: FormGroup;
hasBlurredOnce: boolean = false;
errorSt = null;

constructor(public global: Global, private router: Router, private httpClient: HttpClient, private cdr: ChangeDetectorRef, private fb: FormBuilder) {
	this.formLogin = fb.group({
		"email1": [ "", [ Validators.required ] ],
		"password1": [ "", [ Validators.required, Validators.minLength(6) ] ],
		"rememberme1": [ false, [ ] ]
	});
	this.formRegister = fb.group({
		"name2": ["", [Validators.required, Validators.minLength(2)]],
		"email2": ["", [Validators.required, Validators.email]],
		"password2": ["", [Validators.required, Validators.minLength(6)]],
		"password2Confirm": ["", [Validators.required]],
		"terms2": [false, Validators.requiredTrue]
	}, { validator: this.checkPassword2 });
	this.formForgotPassword = fb.group({
		"email3": ["", [Validators.required, Validators.email]]
	});
	this.formOtp = fb.group({
		"otp14": ["", [ Validators.required, Validators.pattern(/^\d$/) ] ],
		"otp24": ["", [ Validators.required, Validators.pattern(/^\d$/) ] ],
		"otp34": ["", [ Validators.required, Validators.pattern(/^\d$/) ] ],
		"otp44": ["", [ Validators.required, Validators.pattern(/^\d$/) ] ],
		"otp54": ["", [ Validators.required, Validators.pattern(/^\d$/) ] ],
		"otp64": ["", [ Validators.required, Validators.pattern(/^\d$/) ] ]
	});
	this.init();
}

handleBlur(event, element) {
	const inputElement = event.target as HTMLInputElement;
	if (!this.hasBlurredOnce) {
		if (!inputElement.value)
			element.markAsUntouched();
		this.hasBlurredOnce = true;
	}
}

passwordStrength(password) {
	if (!password) return "weak";
	let score = 0;
	if (password.length >= 8) score += 1;
	if (password.length >= 12) score += 1;
	if (/[a-z]/.test(password)) score += 1;
	if (/[A-Z]/.test(password)) score += 1;
	if (/[0-9]/.test(password)) score += 1;
	if (/[^A-Za-z0-9]/.test(password)) score += 1;
	if (score <= 2) return "weak";
	if (score <= 4) return "medium";
	return "strong";
}

passwordStrengthPercentage(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.min((score / 6) * 100, 100);
}

checkPassword2(group: FormGroup) {
	return group.controls.password2.value == group.controls.password2Confirm.value ? null : {"mismatch": true};
}

async init() {
	const params = new URLSearchParams(window.location.search);
	const verify = params.get("verify");
	if (params.has("verify")) {
		await this.doForgotPasswordVerify(verify);
		return;
	}
	if (this.global.session != null)
		this.global.logout();
	this.ready = true;
	if (this.global.demo) {
		if (this.global.settings.lang == "fr")
			this.formLogin.get("email1").setValue("jean.dupont@exemple.fr");
		else
			this.formLogin.get("email1").setValue("john.doe@example.com");
		this.formLogin.get("password1").setValue("demodemo");
		if (window.self === window.top)
			setTimeout(() => { this.submit1E.nativeElement.focus(); }, 100);
		return;
	}
	let email = this.global.getCookie("email");
	if (email != null) {
		this.formLogin.get("email1").setValue(email);
		setTimeout(() => { this.password1E.nativeElement.focus(); }, 100);
	} else
		setTimeout(() => { this.email1E.nativeElement.focus(); }, 100);
}

get email1() { return this.formLogin.get("email1"); }
get password1() { return this.formLogin.get("password1"); }
get rememberme1() { return this.formLogin.get("rememberme1"); }
get email2() { return this.formRegister.get("email2"); }
get name2() { return this.formRegister.get("name2"); }
get password2() { return this.formRegister.get("password2"); }
get password2Confirm() { return this.formRegister.get("password2Confirm"); }
get terms2() { return this.formRegister.get("terms2"); }
get email3() { return this.formForgotPassword.get("email3"); }
get otp14() { return this.formOtp.get("otp14"); }
get otp24() { return this.formOtp.get("otp24"); }
get otp34() { return this.formOtp.get("otp34"); }
get otp44() { return this.formOtp.get("otp44"); }
get otp54() { return this.formOtp.get("otp54"); }
get otp64() { return this.formOtp.get("otp64"); }

show_Login() {
	this.showLogin = true;
	this.showForgotPassword = false;
	this.showRegister = false;
	this.showOtp = false;
	this.hasBlurredOnce = false;
	this.errorSt = null;
	setTimeout(() => { this.email1E.nativeElement.focus(); }, 100);
	this.cdr.detectChanges();
}

async doLogin() {
	this.progress = true;
	this.errorSt = null;
	const data = { password: this.password1.value, rememberme: this.rememberme1.value };
	const isEmail = this.email1.value.indexOf("@") != -1;
	if (isEmail)
		data["email"] = this.email1.value;
	else
		data["username"] = this.email1.value;
	let ret = null;
	try {
		ret = await this.httpClient.post(isEmail ? "/_app_/auth/sign-in/email" : "/_app_/auth/sign-in/username", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth sign-in/email: ", ret);
	} catch(e) { this.errorSt = e.error.message; }
	this.progress = false;
	if (ret != null) {
		if (ret["twoFactorRedirect"] === true)
			this.show_Otp();
		else {
			await this.global.getSession();
			document.location.href = "/";
		}
	} else
		this.cdr.detectChanges();
}

show_Register() {
	this.showLogin = false;
	this.showForgotPassword = false;
	this.showRegister = true;
	this.showOtp = false;
	const e = this.email1.value;
	if (e != "")
		this.email2.setValue(e);
	setTimeout(() => { this.name2E.nativeElement.focus(); }, 100);
	this.hasBlurredOnce = false;
	this.errorSt = null;
	this.cdr.detectChanges();
}

async doRegister() {
	this.progress = true;
	this.errorSt = null;
	const data = { email:this.email2.value, name:this.name2.value, password: this.password2.value };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/sign-up/email", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth sign-up: ", ret);
	} catch(e) { this.errorSt = e.error.message; }
	this.progress = false;
	if (ret != null) {
		await this.global.getSession();
		document.location.href = "/";
	} else
		this.cdr.detectChanges();
}

show_ForgotPassword() {
	this.showLogin = false;
	this.showForgotPassword = true;
	this.showForgotPasswordSent = false;
	this.showRegister = false;
	this.showOtp = false;
	const e = this.email1.value;
	if (e != "")
		this.email3.setValue(e);
	setTimeout(() => { this.email3E.nativeElement.focus(); }, 100);
	this.hasBlurredOnce = false;
	this.errorSt = null;
	this.cdr.detectChanges();
}

async doForgotPassword() {
	this.progress = true;
	this.errorSt = null;
	const data = { email:this.email3.value, callbackURL:window.location.origin, errorCallbackURL:window.location.origin };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/sign-in/magic-link", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth sign-in/magic-link: ", ret);
	} catch(e) { this.errorSt = e.error.message; }
	this.progress = false;
	if (ret != null)
		this.showForgotPasswordSent = true;
		//await this.global.presentAlert("Success!", "An email has been sent with intructions. Please use them to login.", "You can safely close this page now.");
		//this.router.navigate(["/login"]);
	else
		this.cdr.detectChanges();
}

async doForgotPasswordVerify(token) {
	let ret = null;
	try {
		ret = await this.httpClient.get("/_app_/auth/magic-link/verify?token=" + token, {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth magic-link/verify: ", ret);
	} catch(e) { alert("Wrong or expired magic link"); }
	if (ret != null)
		await this.global.getSession();
	document.location.href = "/";
}

handlePaste(event: ClipboardEvent, startIndex: number) {
	event.preventDefault();
	const pastedData = event.clipboardData?.getData("text").trim() || "";
	const otpCode = pastedData.replace(/\s|-/g, "");
	const inputs = this.otpInputs.toArray();
	for (let i = 0; i < otpCode.length && i + startIndex <= 6; i++) {
		const char = otpCode[i];
		if (char.match(/^\d$/))
			this.formOtp.get("otp" + (i + startIndex) + "4")?.setValue(char);
	}
	const lastPopulatedIndex = startIndex + otpCode.length - 1;
	if (lastPopulatedIndex < 6)
		inputs[lastPopulatedIndex]?.nativeElement.focus();
	else if (lastPopulatedIndex == 6)
		this.submit4E.nativeElement.focus();
}

ngAfterViewInit() {
	const inputs = this.otpInputs.toArray();
	inputs.forEach((input: ElementRef, index: number) => {
		input.nativeElement.addEventListener('input', (event) => {
			if (event.target.value.length === 1) {
				if (index < 5)
					inputs[index + 1].nativeElement.focus();
				else if (index == 5)
					this.submit1E.nativeElement.focus();
			}
		});
		input.nativeElement.addEventListener('keydown', (event) => {
		if (event.key === 'Backspace' && input.nativeElement.value.length === 0 && index > 0)
			inputs[index - 1].nativeElement.focus();
		});
	});
}

async show_Otp() {
	this.showLogin = false;
	this.showForgotPassword = false;
	this.showRegister = false;
	this.showOtp = true;
	this.hasBlurredOnce = false;
	this.errorSt = null;
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/two-factor/send-otp", "{}", {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth twofactor/send-otp: ", ret);
	} catch(e) { this.errorSt = e.error.message; }
	setTimeout(() => { this.otpInputs.toArray()[0].nativeElement.focus(); }, 100);
	this.cdr.detectChanges();
}

async doOtp() {
	this.progress = true;
	this.errorSt = null;
	const data = { code:this.otp14.value + this.otp24.value + this.otp34.value + this.otp44.value + this.otp54.value + this.otp64.value };
	let ret = null;
	try {
		ret = await this.httpClient.post("/_app_/auth/two-factor/verify-otp", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
		this.global.consolelog(2, "Auth twofactor/verify-otp: ", ret);
	} catch (e) {
		try {
			ret = await this.httpClient.post("/_app_/auth/two-factor/verify-totp", JSON.stringify(data), {headers:{"content-type": "application/json"}}).toPromise();
			this.global.consolelog(2, "Auth twofactor/verify-totp: ", ret);
		} catch (f) { alert("Wrong code"); }
	}
	this.progress = false;
	if (ret != null)
		await this.global.getSession();
	document.location.href = "/";
}

}
