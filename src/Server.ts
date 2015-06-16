/// <reference path="../decl/node.d.ts" />

export = Server;

import Net = require("net");
import Http = require("http");
import Url = require("url");
import ApiVersions = require("./ApiVersions");
import Tracker = require("./Tracker");

class Server {
	
	private server : Http.Server;

	constructor() {
		this.server = Http.createServer();
		this.server.addListener("request", this.onRequest.bind(this));
		this.server.addListener("error", this.onError.bind(this));
		this.server.addListener("connection", this.onConnection.bind(this));
	}

	start(port : number, host : string) {
		console.log("Starting server...");
		this.server.listen(port, host, this.onStart.bind(this));
	}

	stop() {
		console.log("Stopping server...");
		this.server.close(this.onStop.bind(this));
	}

	private onStart() {
		var host = this.server.address().address;
		var port = this.server.address().port;
		console.log("Listening at http://%s:%s", host, port);
	}

	private onStop() {
		console.log("Server has been closed.");
	}

	private onConnection(socket : Net.Socket) {
		// Imposes a limit to keep-alive connections so that the server
		// can safetely wait for all sockets to close on stop()
		socket.setTimeout(5000);
	}
	
	private onRequest(msg : Http.IncomingMessage, resp : Http.ServerResponse) {
		console.log(msg.url);
		var ip = msg.headers["x-forwarded-for"] || msg.socket.remoteAddress;
		var request = Url.parse(msg.url, true);
		var path = request.pathname.split("/");
		var apiVersion = path[1];
		var api = ApiVersions[apiVersion];
		var method = msg.method.toLowerCase()
		var endpoint = "/" + path.slice(2).join("/");
		var endpointMethod = method + endpoint.replace(/\//g, "_");
		var query = request.query;
		
		var tracker = new Tracker();
		tracker.setIp(ip);
		tracker.setEndpoint(endpoint);
		tracker.setApiVersion(apiVersion);
		
		query.body = "";
		msg.on("data", (data : string) => {
			query.body += data;
			
			if (query.body.length > 1e7) { // 10MB
				msg.socket.destroy();
				resp.statusCode = 413; // Request Entity Too Large
				resp.end();
			}
		});
		msg.on("end", () => {
			if (!api) {
				resp.statusCode = 404;
				resp.end();
			} else {
				var endpointFunction = api[endpointMethod];
				if (!endpointFunction) {
					resp.statusCode = 404;
					resp.end();
				} else {
					api[endpointMethod](tracker, query, resp);
				}
			}
		});
	}

	private onError(err : Error) {
		console.log(err);
	}
}
