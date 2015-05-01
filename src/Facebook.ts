export = Facebook;

import Graph = require("fbgraph");
import DB = require("./DB");
import Http = require("http");
import Https = require("https");
import MongoDB = require("mongodb");

class Facebook {
	static apiVersion = "v2.3"

	token: string;

	constructor(token? : string) {
		this.token = token;
	}

	fetchAvatar(id : string, callback : (err : Error, buff : Buffer) => void) {
		Https.get({host: "graph.facebook.com", path: "/"+Facebook.apiVersion+"/"+id+"/picture?type=square&width=300&height=300"},
		function(res : Http.IncomingMessage) {
			res.on("data", function() {}); // noop, but required. Otherwise 'end' will never be fired.
			res.on("end", function() {
				var uri = res.headers.location;
				if (!uri) {callback(new Error("avatar not found"), null); return;}
				Https.get(uri, function(res : Http.IncomingMessage) {
					res.setEncoding('binary');
					var data = ""
					res.on("data", function(chunk : string) {
						data += chunk;
					});
					res.on("end", function() {
						callback(null, new Buffer(data, "binary"));
					});
				});
			});
		});
	}

	fetchMe(callback : (err : Error, userInfo : Facebook.User) => void) {
		Https.get({host: "graph.facebook.com", path: "/"+Facebook.apiVersion+"/me/?access_token="+this.token},
		function(res : Http.IncomingMessage) {
			var data = ""
			res.on("data", function(chunk : string) {
				data += chunk;
			});
			res.on("end", function() {
				var obj = JSON.parse(data);
				if (obj.error)
					callback(new Error(obj.error.type + ": " + obj.error.message), null);
				else
					callback(null, JSON.parse(data));
			});
		});
	}
	
}

module Facebook {
	export type User = {
		id : string;
		name : string;
	}
}
