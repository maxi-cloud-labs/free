import { WebSocketServer, WebSocket } from "ws";
import { createServer, Socket } from "net";
import { existsSync, unlinkSync, chmodSync } from "fs";
import { appSocketPath } from "./common";
import { communicationReceive } from "./communication";

//Variables
const websocketPort = 8094;
// Browsers connect on /ws/ and receive broadcasts, scripts (websocat) connect on / and only send
const webClients = new Set<WebSocket>();
// app (PI5 board only) connects on a Unix socket, one JSON message per line
let appClient: Socket | null = null;

//Functions
export function webSend(data) {
	const st = JSON.stringify(data);
	for (const client of webClients)
		if (client.readyState === WebSocket.OPEN)
			client.send(st);
}

export function appSend(data): boolean {
	if (appClient == null)
		return false;
	appClient.write(JSON.stringify(data) + "\n");
	return true;
}

// To browsers and to app, which relays to its BLE client
export function broadcast(data) {
	webSend(data);
	appSend({ a:"forward", p:data });
}

function appSocketInit() {
	if (existsSync(appSocketPath))
		unlinkSync(appSocketPath);
	const server = createServer((socket) => {
		if (appClient != null)
			appClient.destroy();
		appClient = socket;
		console.log("websocket.ts: app connected");
		appSend({ a:"connection", v:webClients.size > 0 ? 1 : 0 });
		let buffer = "";
		socket.setEncoding("utf8");
		socket.on("data", (chunk) => {
			buffer += chunk;
			let pos;
			while ((pos = buffer.indexOf("\n")) >= 0) {
				const line = buffer.slice(0, pos);
				buffer = buffer.slice(pos + 1);
				if (line.length > 0)
					communicationReceive(line, "app");
			}
		});
		socket.on("close", () => {
			if (appClient === socket)
				appClient = null;
			console.log("websocket.ts: app disconnected");
		});
		socket.on("error", (e) => console.error("websocket.ts: app " + e.message));
	});
	server.on("error", (e) => console.error("websocket.ts: app socket " + e.message));
	server.listen(appSocketPath, () => chmodSync(appSocketPath, 0o600));
}

export function websocketInit() {
	const wss = new WebSocketServer({ host:"127.0.0.1", port:websocketPort });
	wss.on("connection", (ws, req) => {
		if (req.url === "/ws/") {
			webClients.add(ws);
			if (webClients.size == 1)
				appSend({ a:"connection", v:1 });
		}
		ws.on("message", (msg) => communicationReceive(msg.toString(), "websocket"));
		ws.on("close", () => {
			if (webClients.delete(ws) && webClients.size == 0)
				appSend({ a:"connection", v:0 });
		});
		ws.on("error", (e) => console.error("websocket.ts: " + e.message));
	});
	wss.on("error", (e) => console.error("websocket.ts: " + e.message));
	wss.on("listening", () => console.log("websocket.ts: OK"));
	appSocketInit();
}
