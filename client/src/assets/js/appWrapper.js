var Module;
var thisble;
var initDone = false;
var socket = null;
var appDeveloper = false;

function console_log(level, ...st) {
	if (level == 0 || appDeveloper)
		console.log(...st);
}

function loadScript(src) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.type = "text/javascript";
		script.src = src;
		script.onload = () => resolve(script);
		script.onerror = (error) => reject(error);
		document.body.appendChild(script);
	});
}

async function appInit(path, log, slave, elCanvas, dataCloud = null) {
	if (!initDone) {
		await loadScript(path);
		initDone = true;
	}
	var argCmdLine = [];
	if (window.location.hostname.indexOf("mondongle.cloud") != -1 || navigator.language.startsWith("fr"))
		argCmdLine.push("-l", "fr");
	if (slave)
		argCmdLine.push("-s");
	if (dataCloud)
		argCmdLine.push("-a", JSON.stringify(dataCloud));
	Module = {
		print: function(text) { console_log(log ? 0 : 1, text); },
		canvas: elCanvas,
		arguments: argCmdLine
	};
	await appCreate(Module);
}

function appButton(b, l) {
	if (!initDone)
		return;
	Module._button(b, l);
}

function appCommunicationStatus(s) {
	if (!initDone)
		return;
	Module._communicationStatus(s);
}

function appServerWriteDataHtml(data, isB64) {
	if (!initDone)
		return;
	var st;
	if (isB64)
		st = atob(data);
	else
		st = data;
	//Module.print("(JS) appServerWriteDataHtml: data#" + st + "#B64:" + isB64);
	if (socket != null)
		socket.send(st);
	else
		thisble.writeData(st);
}

function appServerReceiveHtml(data, doB64) {
	if (!initDone)
		return;
	//Module.print("(JS) appServerReceiveHtml: data#" + data + "#B64:" + doB64);
	var st;
	if (doB64)
		st = btoa(data);
	else
		st = data;
	var size = Module.lengthBytesUTF8(st) + 1;
	var ptr = Module._malloc(size);
	Module.stringToUTF8(st, ptr, size);
	Module._serverReceiveHtml(ptr, doB64);
	Module._free(ptr);
}

function appConnectToggle(onoff) {
	if (typeof onoff == "undefined")
		onoff = socket == null;
	if (!onoff && socket != null) {
		socket.close();
		socket = null;
		if (thisble) thisble.connectedWS = 0;
	}
	if (onoff && socket == null) {
		if (thisble) thisble.connectedWS = 1;
		const protocol = "ws" + (window.location.protocol === "https:" ? "s" : "") + "://";
		let host = window.location.hostname == "" || window.location.hostname == "localhost" ? "localhost:8094" : window.location.host;
		const ws = protocol + host + "/ws/";
		console_log(1, "socketInit " + ws);
		socket = new WebSocket(ws);
		socket.binaryType = "arraybuffer";
		socket.onopen = () => {
			console_log(1, "Socket onopen");
			if (thisble) thisble.connectedWS = 2;
			if (thisble) thisble.communicationEvent.next({ msg:"connection" });
		}
		socket.onerror = (e) => {
			console_log(1, "Socket onerror " + JSON.stringify(e));
			socket = null;
			if (thisble) thisble.connectedWS = 0;
			appCommunicationStatus(0);
		}
		socket.onclose = (e) => {
			console_log(1, "Socket onclose");
			socket = null;
			if (thisble) thisble.connectedWS = 0;
			appCommunicationStatus(0);
		}
		socket.onmessage = (msg) => {
			if (thisble)
				thisble.communicationReceive(msg.data);
			else
				appServerReceiveHtml(msg.data, 1);
		}
	}
}

function appSend(o) {
	const st = typeof(o) === "string" ? o : JSON.stringify(o);
	if (socket != null)
		socket.send(st);
}

function appRefreshScreen() {
	if (socket != null)
		socket.send(JSON.stringify({ a:"refresh-screen" }));
}

function appShutdown() {
	if (socket != null)
		socket.send(JSON.stringify({ a:"shutdown" }));
}

function appOtp(email) {
	if (socket != null)
		socket.send(JSON.stringify({ a:"otp", v:-1, e:email }));
}

function appLanguage(la) {
	if (socket != null)
		socket.send(JSON.stringify({ a:"language", l:la }));
}
