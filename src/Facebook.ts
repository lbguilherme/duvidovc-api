export = Facebook;

import Http = require("http");
import Https = require("https");

module Facebook {
	var url = "https://graph.facebook.com/v2.3";
	
	export type User = {
		id : string;
		name : string;
	}

	export function fetchAvatar(id : string, callback : (err : Error, buff : Buffer) => void) {
		Https.get(url+"/"+id+"/picture?type=square&width=300&height=300",
		function(res : Http.IncomingMessage) {
			res.on("data", function() {}); // noop, but required. Otherwise 'end' will never be fired.
			res.on("end", function() {
				var uri = res.headers.location;
				if (!uri) {callback(new Error("avatar not found"), null); return;}
				Https.get(uri, function(res : Http.IncomingMessage) {
					res.setEncoding('binary');
					var data = "";
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

	export function fetchMe(token : string, callback : (err : Error, userInfo : Facebook.User) => void) {
		Https.get(url+"/me/?access_token="+token,
		function(res : Http.IncomingMessage) {
			var data = "";
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

	export function fetchUser(token : string, id : string, callback : (err : Error, userInfo : Facebook.User) => void) {
		Https.get(url+"/"+id+"/?access_token="+token,
		function(res : Http.IncomingMessage) {
			var data = "";
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
	
	export function fetchFriends(token : string, callback : (err : Error, ids : string[], names : string[]) => void) {
		var ids : string[] = [];
		var names : string[] = [];

		function requestPage(uri : string) {
			Https.get(uri, function(res : Http.IncomingMessage) {
				var data = "";
				res.on("data", function(chunk : string) {
					data += chunk;
				});
				res.on("end", function() {
					processPage(JSON.parse(data));
				});
			});
		}

		function processPage(obj : any) {
			if (obj.error) {
				callback(new Error(obj.error.type + ": " + obj.error.message), null, null);
				return;
			}
			for (var i = 0; i < obj.data.length; ++i) {
				ids.push(obj.data[i].id);
				names.push(obj.data[i].name);
			}
			if (obj.paging && obj.paging.next)
				requestPage(obj.paging.next);
			else
				callback(null, ids, names);
		}

		requestPage(url+"/me/friends/?access_token="+token);
	}
}
