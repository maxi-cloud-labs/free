import "dotenv/config";
import { writeFileSync } from "fs";
import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import { auth, jwkInit, port } from "./auth";
import express from "express";
import morgan from "morgan";
import cors from "cors";

//Run
main();

//Function
function main() {
	const app = express();
	/*
	//console.log(auth);
	app.use((req, res, next) => {
		console.log(`Request (${req.method}) ${req.path}`);
		//console.log({ method:req.method, path:req.path, host:req.get("host"), headers:req.headers });//
		next();
	});
	*/
	app.use(morgan(":method :url :status :response-time ms", {
		skip: function (req, res) {
			return req.url === '/stats';
		}
	}));
	app.use(cors({
		origin: ["*"],
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
		credentials: true
	}));
	app.use(express.json({ limit: "1mb" }));
	app.use(express.urlencoded({ limit:"1mb", extended:true }));
	app.use(cookieParser());
	app.set("trust proxy", "loopback");
	app.use("/auth", toNodeHandler(auth.handler));
	app.listen(port, "127.0.0.1", () => {
		jwkInit();
		console.log("Server running at http://localhost: " + port + " (" + (process.env.PRODUCTION === "true" ? "production" : "development") + ")");
	});
}
