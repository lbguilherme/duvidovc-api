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

export function typeCheck(object : any, type : any, path? : string) {
	if (!path)
		path = "obj";
	
	if (typeof type == "string") {
		if (typeof object != type)
			throw new TypeError("Expected " + path + " to be of type " + type + " but got " + typeof object);
	} else if (typeof type == "object") {
		if (typeof object != "object")
			throw new TypeError("Expected " + path + " to be an object but got " + typeof object);
		Object.keys(type).forEach(field => {
			typeCheck(object[field], type[field], path+"."+field);
		});
	} else {
		throw new TypeError("Invalid type " +  type);
	}
}
