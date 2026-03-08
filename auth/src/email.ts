import { readFileSync } from "fs";
import nodemailer from "nodemailer";

//Variables
let transporter, APP_NAME, APP_URL, APP_ADMIN;

//Run
lazyInit();

//Functions
async function lazyInit() {
    const { cloud } = await import("./auth");
	APP_NAME = "MyDongle.Cloud " + cloud?.info?.name;
	APP_URL = "https://app." + cloud?.info?.name + ".mydongle.cloud";
	APP_ADMIN = "admin@" + cloud?.info?.name + ".mydongle.cloud";
}

async function transporterInit() {
	if (transporter)
		return;
	const pf = JSON.parse(readFileSync("/disk/admin/modules/_config_/postfix.json", "utf-8"));
	transporter = nodemailer.createTransport({
		host: "localhost",
		auth: {
			user: APP_ADMIN,
			pass: pf["password"]
		},
		port: 465,
		secure: true,
		tls: { rejectUnauthorized: false }
	});
}

export async function sendMagicLinkEmail(to, token, url) {
	await transporterInit();
	const link = APP_URL + "/_app_/login?verify=" + token;
	await transporter.sendMail({
	from: `"Admin ${APP_NAME}" <${APP_ADMIN}>`,
	to,
	subject: `Magic Link to Login [${APP_NAME}]`,
	html: `
		<div style="font-family:sans-serif; line-height:1.5; max-width:600px; margin:0 auto;">
			<div style="background-color:#0054e9; padding:20px; text-align:center;">
				<h1 style="color:white; margin:0;">${APP_NAME}</h1>
			</div>
			<div style="padding:30px; background-color:#f9f9f9;">
				<h2 style="color:#333;">Unique URL to Login</h2>
				<p>Hello,</p>
				<p>Please use the button below to login:</p>
				<div style="text-align:center; margin:30px 0;">
					<div style="background-color:#2dd55b; color:white; padding:15px 30px; display:inline-block; border-radius:8px; font-size:24px; font-weight:bold; letter-spacing:3px;"><a href="${link}">Automatic Login</a></div>
				</div>
				<p style="color:#666;">Copy-paste this link in your browser if needed:<br>${link}</p>
				<p style="color:#666;">This link will expire in 5 minutes for security reasons.</p>
				<p>If you didn't request this link, please ignore this email.</p>
				<hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
				<p>Thank you,<br/><a href="${APP_URL}" target="_blank" style="color:#ff6b6b;">${APP_NAME}</a></p>
			</div>
		</div>
	`,
	});
};

export async function sendVerificationEmail(to, code) {
	await transporterInit();
	await transporter.sendMail({
	from: `"Admin ${APP_NAME}" <${APP_ADMIN}>`,
	to,
	subject: `Verify Email [${APP_NAME}]`,
	html: `
		<div style="font-family:sans-serif; line-height:1.5; max-width:600px; margin:0 auto;">
			<div style="background-color:#0054e9; padding:20px; text-align:center;">
				<h1 style="color:white; margin:0;">${APP_NAME}</h1>
			</div>
			<div style="padding:30px; background-color:#f9f9f9;">
				<h2 style="color:#333;">Email Verification Required</h2>
				<p>Hello,</p>
				<p>Please use the verification code below to verify your email address:</p>
				<div style="text-align:center; margin:30px 0;">
					<div style="background-color:#2dd55b; color:white; padding:15px 30px; display:inline-block; border-radius:8px; font-size:24px; font-weight:bold; letter-spacing:3px;">${code}</div>
				</div>
				<p style="color:#666;">This code will expire in 10 minutes for security reasons.</p>
				<p>If you didn't request this verification, please ignore this email.</p>
				<hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
				<p>Thank you,<br/><a href="${APP_URL}" target="_blank" style="color:#ff6b6b;">${APP_NAME}</a></p>
			</div>
		</div>
	`,
	});
};

export async function sendPasswordResetVerificationEmail(to, code) {
	await transporterInit();
	await transporter.sendMail({
	from: `"Admin ${APP_NAME}" <${APP_ADMIN}>`,
	to,
	subject: `Reset Password [${APP_NAME}]`,
	html: `
		<div style="font-family:sans-serif; line-height:1.5; max-width:600px; margin:0 auto;">
			<div style="background-color:#0054e9; padding:20px; text-align:center;">
				<h1 style="color:white; margin:0;">${APP_NAME}</h1>
			</div>
			<div style="padding:30px; background-color:#f9f9f9;">
				<h2 style="color:#333;">Password Reset Request</h2>
				<p>Hello,</p>
				<p>We received a request to reset your password. Use the code below to proceed:</p>
				<div style="text-align:center; margin:30px 0;">
					<div style="background-color:#2dd55b; color:white; padding:15px 30px; display:inline-block; border-radius:8px; font-size:24px; font-weight:bold; letter-spacing:3px;">${code}</div>
				</div>
				<p style="color:#666;">This code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
				<p><strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for this code.</p>
				<hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
				<p>Thank you,<br/><a href="${APP_URL}" target="_blank" style="color:#ff6b6b;">${APP_NAME}</a></p>
			</div>
		</div>
	`,
	});
};

export async function sendSignInNotification(to) {
	await transporterInit();
	await transporter.sendMail({
	from: `"Admin ${APP_NAME}" <${APP_ADMIN}>`,
	to,
	subject: `Sign-In Notification [${APP_NAME}]`,
	html: `
		<div style="font-family:sans-serif; line-height:1.5; max-width:600px; margin:0 auto;">
			<div style="background-color:#0054e9; padding:20px; text-align:center;">
				<h1 style="color:white; margin:0;">${APP_NAME}</h1>
			</div>
			<div style="padding:30px; background-color:#f9f9f9;">
				<h2 style="color:#333;">Sign In to Your Account</h2>
				<p>Hello,</p>
				<p>The email ${to} has just signed-in.</p>
				<p>If you didn't trigger that action, contact the administrator immediately.</p>
				<hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
				<p>Thank you,<br/><a href="${APP_URL}" target="_blank" style="color:#ff6b6b;">${APP_NAME}</a></p>
			</div>
		</div>
	`,
	});
};

export async function sendSignInOTP(to, code) {
	await transporterInit();
	await transporter.sendMail({
	from: `"Admin ${APP_NAME}" <${APP_ADMIN}>`,
	to,
	subject: `Sign-In Code [${APP_NAME}]`,
	html: `
		<div style="font-family:sans-serif; line-height:1.5; max-width:600px; margin:0 auto;">
			<div style="background-color:#0054e9; padding:20px; text-align:center;">
				<h1 style="color:white; margin:0;">${APP_NAME}</h1>
			</div>
			<div style="padding:30px; background-color:#f9f9f9;">
				<h2 style="color:#333;">Sign In to Your Account</h2>
				<p>Hello,</p>
				<p>Use the code below to sign in to your account:</p>
				<div style="text-align:center; margin:30px 0;">
					<div style="background-color:#2dd55b; color:white; padding:15px 30px; display:inline-block; border-radius:8px; font-size:24px; font-weight:bold; letter-spacing:3px;">${code}</div>
				</div>
				<p style="color:#666;">This code will expire in 10 minutes for security reasons.</p>
				<p>If you didn't try to sign in, please ignore this email and consider changing your password.</p>
				<hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
				<p>Thank you,<br/><a href="${APP_URL}" target="_blank" style="color:#ff6b6b;">${APP_NAME}</a></p>
			</div>
		</div>
	`,
	});
};

export async function sendVerificationEmailURL(to, url) {
	await transporterInit();
	await transporter.sendMail({
	from: `"${APP_NAME} - Email Verification" <${APP_ADMIN}>`,
	to,
	subject: `Verify email [${APP_NAME}]`,
	html: `
		<div style="font-family:sans-serif; line-height:1.5; max-width:600px; margin:0 auto;">
			<div style="background-color:#0054e9; padding:20px; text-align:center;">
				<h1 style="color:white; margin:0;">${APP_NAME}</h1>
			</div>
			<div style="padding:30px; background-color:#f9f9f9;">
				<h2 style="color:#333;">Confirm Your Email Address</h2>
				<p>Hello,</p>
				<p>Click the button below to verify your email address and activate your account:</p>
				<div style="text-align:center; margin:30px 0;">
				<a href="${url}" target="_blank" style="background-color:#4caf50; color:white; padding:15px 30px; text-decoration:none; border-radius:8px; font-size:18px; font-weight:bold; display:inline-block;">Verify Email</a>
				</div>
				<p style="color:#666;">If the button doesn’t work, copy and paste the following URL into your browser:</p>
				<p style="word-break:break-all;"><a href="${url}" target="_blank" style="color:#4caf50;">${url}</a></p>
				<p>If you didn't sign up for this account, you can safely ignore this email.</p>
				<hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
				<p>Thank you,<br/><a href="${APP_URL}" target="_blank" style="color:#ff6b6b;">${APP_NAME}</a></p>
			</div>
		</div>
	`,
	});
};
