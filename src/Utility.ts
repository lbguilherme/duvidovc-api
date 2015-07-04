/// <reference path="../decl/bluebird.d.ts" />

import Http = require("http");
import Bluebird = require("bluebird");
import await = require("asyncawait/await");

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
