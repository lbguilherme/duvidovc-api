export = Facebook;

import Graph = require("fbgraph");
import DB = require("./DB");
import Http = require("http");
import Https = require("https");
import MongoDB = require("mongodb");

class Facebook {
	token: string

	constructor(token? : string) {
		this.token = token;
	}

	sendAvatar(id : string, resp : Http.ServerResponse) {
		DB.avatars.find({userId : id}, function(err : Error, cur : MongoDB.Cursor) {
			if (err) {resp.statusCode = 500; resp.end(); return;}
			cur.toArray(function(err: Error, results: any[]) {
				if (err) {resp.statusCode = 500; resp.end(); return;}
				function send(buff : Buffer) {
					console.log(buff.length);
					resp.setHeader("Content-Type", "image/png");
					resp.write(buff);
					resp.end();
				}
				if (results.length == 0)
					this.fetchAvatar(id, function(err : Error, buff : Buffer) {
						if (err) {resp.statusCode = 500; resp.end(); return;}
						send(buff);
						var data = new MongoDB.Binary(buff);
						DB.avatars.insertOne({userId : id, data: data}, function(){});
					});
				else {
					var data : MongoDB.Binary = results[0].data;
					var buff = data.read(0, data.length());
					send(buff);
				}
			}.bind(this));
		}.bind(this));
	}

	fetchAvatar(id : string, callback : (err : Error, buff : Buffer) => void) {
		Https.get({host: "graph.facebook.com", path: "/"+id+"/picture?type=square&width=300&height=300"},
		function(res : Http.IncomingMessage) {
			res.on("data", function() {}); // noop, but required. Otherwise 'end' will never be fired.
			res.on("end", function() {
				var uri = res.headers.location;
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
	
}
