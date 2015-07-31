/// <reference path="../decl/node-gcm.d.ts" />

export = Notification;

import Gcm = require("node-gcm");
import Duvido = require("./Duvido");

var gcmSender = new Gcm.Sender("AIzaSyB-uONMzVy81sRHd3mBhF4AzWnpmEYVCpw");

class Notification {
	message : Gcm.Message
	target : Duvido.User
	
	constructor(target : Duvido.User) {
		this.message = new Gcm.Message();
		this.target = target;
	}
	
	setData(data : {}) {
		this.message.addData(data);
	}
	
	send() {
		var ids = this.target.getGcmTokens();
		if (ids.length == 0) return;
		gcmSender.send(this.message, ids, (err, result) => {
			// Result is irrelevant. There is nothing to do if it fails.
		});
	}
}
