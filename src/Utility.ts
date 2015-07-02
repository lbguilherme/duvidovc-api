/// <reference path="../decl/bluebird.d.ts" />

import Http = require("http");
import Bluebird = require("bluebird");
import await = require("asyncawait/await");

export function doForAll(times : number, action : (i : number, done : () => void) => void, allDone : () => void) {
	var dones = 0;
	for (var i = 0; i < times; ++i) {
		action(i, () => {
			dones += 1;
			if (dones == times)
				allDone();
		});
	}
}

export function readAll(msg : Http.IncomingMessage) {
	return await(new Bluebird.Promise((resolve) => {
		var contents = "";
		msg.on("data", (data : string) => {
			contents += data;
		});
		msg.on("end", () => {
			resolve(contents);
		});
	}));
}
