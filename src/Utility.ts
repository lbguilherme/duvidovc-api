/// <reference path="../decl/bluebird.d.ts" />

import * as Http from "http";
import { Promise } from "bluebird";

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
	return new Promise((resolve : (result: string) => void, reject : (error: Error) => void) => {
		var contents = "";
		msg.on("data", (data : string) => {
			contents += data;
		});
		msg.on("end", () => {
			resolve(contents);
		});
	});
}
