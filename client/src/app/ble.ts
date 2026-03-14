import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BleClient, textToDataView, numberToUUID, ScanResult, ConnectionPriority } from '@capacitor-community/bluetooth-le';
import { Global } from './env';
import { Subject } from 'rxjs';

const BLE_NAME = "mAxI-";
const UUID_GATT = "0000fff0-a82e-1000-8000-00805f9b34fb";
const UUID_VERSION = "0000fff1-a82e-1000-8000-00805f9b34fb";
const UUID_DATA = "0000fff2-a82e-1000-8000-00805f9b34fb";

const BLE_CHUNK = 182;

declare var thisble: any;
declare var appServerReceiveHtml: any;
declare var appCommunicationStatus: any;

@Injectable({
  providedIn: 'root'
})

export class BleService {
connectedBLE: number = 0;
connectedWS: number = 0;
deviceID: string;
deviceName: string;
pairReceived: boolean;
firmwareDeviceVersion: string;
deviceAddr: string;
lastTouch = null;
bleClientInitialized: boolean = false;
communicationEvent:Subject<any> = new Subject();

constructor(private global: Global, private router: Router) {
	this.bleClientInitialize();
	thisble = this;
}

async bleClientInitialize() {
	try {
		await BleClient.initialize();
		this.bleClientInitialized = true;
		return;
	} catch(e) {}
}

connectToggle() {
	if (this.connectedBLE == 2)
		this.disconnect();
	else if (this.connectedBLE == 1) {
		this.connectedBLE = 0;
		this.global.refreshUI.next(true);
		this.communicationEvent.next({ msg:"connection" });
		this.stopScan();
	} else
		this.tryConnect();
}

async stopScan() {
	this.global.consolelog(1, "Stop Scan");
	await BleClient.stopLEScan();
}

async disconnect() {
	await BleClient.disconnect(this.deviceID);
	this.connectedBLE = 0;
	this.global.refreshUI.next(true);
	this.communicationEvent.next({ msg:"connection" });
	await this.stopScan();
}

async tryConnect() {
	this.global.consolelog(1, "tryConnect");
	this.connectedBLE = 1;
	this.global.refreshUI.next(true);
	this.communicationEvent.next({ msg:"connection" });
	if (!this.bleClientInitialized)
		await this.bleClientInitialize();
	try {
		if (!await BleClient.isEnabled())
			await BleClient.requestEnable();
	} catch(e) {
		this.global.consolelog(1, "BLE enable() not working " + e.message);
	}
	this.global.consolelog(1, "BLE isEnabled:" + await BleClient.isEnabled());
	if (!this.global.plt.is("android") && !this.global.plt.is("ios")) {
		try {
			const bled = await BleClient.requestDevice({ namePrefix:BLE_NAME, optionalServices:[UUID_GATT] });
			this.deviceID = bled.deviceId;
			this.deviceName = bled.name;
			await this.connectToBluetoothDevice(bled.deviceId);
		} catch(e) {
			this.connectedBLE = 0;
			this.global.refreshUI.next(true);
			this.communicationEvent.next({ msg:"connection" });
		}
	} else {
		await BleClient.requestLEScan({ namePrefix:BLE_NAME, services:[UUID_GATT] }, this.onBluetoothDeviceFound.bind(this));
	}
}

async onBluetoothDeviceFound(result) {
	this.global.consolelog(1, "onBluetoothDeviceFound " + JSON.stringify(result));
	if (result.device.name != undefined && result.device.name.startsWith(BLE_NAME)) {
		if (this.deviceID != "") {
			await this.stopScan();
			this.global.refreshUI.next(true);
			return;
		}
		this.deviceID = result.device.deviceId;
		this.deviceName = result.device.name;
		this.global.consolelog(1, "onBluetoothDeviceFound " + result.device.deviceId);
		this.global.consolelog(1, "Found device Connecting to " + this.deviceID + " (" + this.deviceName + ")...");
		await this.stopScan();
		await this.connectToBluetoothDevice(result.device.deviceId);
	}
}

async writeData(a) {
	const st = typeof(a) === "string" ? a : JSON.stringify(a);
	if (st.length > BLE_CHUNK) {
		let remain = st.length;
		let count = 0;
		while (remain > 0) {
			let aa0, aa1;
			if (count == 0) {
				aa0 = 1;
				aa1 = Math.ceil(st.length / (BLE_CHUNK - 2));
			} else {
				aa0 = 2;
				aa1 = count;
			}
			const pos = count * (BLE_CHUNK - 2);
			const chunkSize = Math.min(remain, BLE_CHUNK - 2);
			const aa = "" + String.fromCodePoint(aa0) + String.fromCodePoint(aa1) + st.substring(pos, pos + chunkSize);
			await BleClient.write(this.deviceID, UUID_GATT, UUID_DATA, textToDataView(aa));
			await this.global.sleepms(50);
			remain -= BLE_CHUNK - 2;
			count++;
		}
	} else
		await BleClient.write(this.deviceID, UUID_GATT, UUID_DATA, textToDataView(st));
}

communicationReceive(st) {
	const data = JSON.parse(st);
	if (data.a === "state")
		appServerReceiveHtml(st, 0);
	else if (data.a === "status")
		this.global.statusRefresh(data);
	else
		this.communicationEvent.next({ msg:"communication", data:data });
}

dataChunks;
data = "";
bleNotifyDataCb = ((value) => {
	const data_ = new Uint8Array(value.buffer);
	if (data_[0] == 1) {
		this.data = "";
		this.dataChunks = data_[1];
		for (let i = 2; i < BLE_CHUNK; i++)
			this.data += String.fromCharCode(data_[i]);
		this.dataChunks--;
	} else if (this.data != "" && data_[0] == 2) {
		for (let i = 2; i < Math.min(BLE_CHUNK, data_.byteLength); i++)
			this.data += String.fromCharCode(data_[i]);
		this.dataChunks--;
		if (this.dataChunks == 0) {
			this.communicationReceive(this.data);
			this.data = "";
		}
	} else if (data_[0] == '{'.charCodeAt(0)) {
		this.data = "";
		for (let i = 0; i < data_.byteLength; i++)
			this.data += String.fromCharCode(data_[i]);
		this.communicationReceive(this.data);
		this.data = "";
	}
});

async connectToBluetoothDevice(devId: string) {
	let err = 0;
	const a = await BleClient.connect(devId, (dId) => {this.onDeviceDisconnected(dId);}).catch(error => {
		this.global.consolelog(1, "connect error: ", error);
		err = 1;
	});
	if (err == 1) {
		this.connectedBLE = 0;
		this.global.refreshUI.next(true);
		this.communicationEvent.next({ msg:"connection" });
		return;
	}
	appCommunicationStatus(1);
	this.global.consolelog(1, "connectToBluetoothDevice device success!");
	this.connectedBLE = 2;
	this.global.refreshUI.next(true);
	this.communicationEvent.next({ msg:"connection" });
	this.listServices(devId);
	BleClient.startNotifications(devId, UUID_GATT, UUID_DATA, this.bleNotifyDataCb).catch(error => {
		this.global.consolelog(1, "startNotifications UUID_DATA error: ", error)
	});
	await this.version();
	await this.syncDate();
	if (this.global.plt.is("android")) {
		this.global.consolelog(1, "Request HIGH ConnectionPriority for interval");
		BleClient.requestConnectionPriority(devId, ConnectionPriority.CONNECTION_PRIORITY_HIGH);
	}
}

onDeviceDisconnected(disconnectedDeviceId: string) {
	this.deviceID = "";
	this.deviceName = "";
	this.connectedBLE = 0;
	this.global.refreshUI.next(true);
	this.communicationEvent.next({ msg:"connection" });
	this.global.consolelog(1, "Disconnected device " + disconnectedDeviceId);
	appCommunicationStatus(0);
}

async listServices(deviceId: string) {
	try {
		await BleClient.getServices(deviceId).then((value) => {
			this.global.consolelog(1, "services " + JSON.stringify(value));
		});
	} catch (e) {
	  this.global.consolelog(1, "getServices Error " + e.message());
	}
}

async otp(email) {
	await this.writeData({ a:"otp", v:-1, e:email });
}

async language(la) {
	await this.writeData({ a:"language", l:la });
}

async shutdown() {
	await this.writeData({ a:"shutdown" });
}

async syncDate() {
	const d = new Date();
	const localTime = Math.floor(d.getTime() / 1000 - (d.getTimezoneOffset() * 60));
	await this.writeData({ a:"date", v:localTime });
}

async version() {
	await BleClient.read(this.deviceID, UUID_GATT, UUID_VERSION).then(value => {
		const ar = new Uint8Array(value.buffer);
		this.firmwareDeviceVersion = new TextDecoder().decode(ar);
		this.global.consolelog(1, "Device version " + this.firmwareDeviceVersion);
		this.global.refreshUI.next(true);
	});
}

}
