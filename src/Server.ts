/// <reference path="../decl/node.d.ts" />
/// <reference path="../decl/asyncawait.d.ts" />

export = Server;

import Net = require("net");
import Http = require("http");
import Url = require("url");
import async = require("asyncawait/async");
import ApiVersions = require("./ApiVersions");
import Utility = require("./Utility");
import InvalidTokenError = require("./InvalidTokenError");
import InputError = require("./InputError");

class Server {
	
	private server : Http.Server;

	constructor(port : number, host : string) {
		console.log("Starting server...");
		this.server = Http.createServer();
		this.server.addListener("request", this.onRequest.bind(this));
		this.server.addListener("error", this.onError.bind(this));
		this.server.listen(port, host, this.onStart.bind(this));
	}

	private onStart() {
		var host = this.server.address().address;
		var port = this.server.address().port;
		console.log("Listening at http://%s:%s", host, port);
	}
	
	private onRequest(msg : Http.IncomingMessage, resp : Http.ServerResponse) {
		console.log(msg.url);
			
		async(() => {
			
			var ip = msg.headers["x-forwarded-for"] || msg.socket.remoteAddress;
			var request = Url.parse(msg.url.replace(/\+/g, "%2B"), true);
			var path = request.pathname.split("/");
			var apiVersion = path[1];
			var method = msg.method.toLowerCase()
			var endpoint = "/" + path.slice(2).join("/");
			var endpointMethod = method + endpoint.replace(/\//g, "_");
			var query = request.query;
			query.body = Utility.readAll(msg);
			query.ip = ip;
			query.api = apiVersion;
			
			var api = ApiVersions[apiVersion];
			if (!api) {
				resp.statusCode = 404; // Not Found
				resp.end();
				return;
			} 
			
			var endpointFunction = api[endpointMethod];
			if (!endpointFunction) {
				resp.statusCode = 404; // Not Found
				resp.end();
				return;
			}
			
			endpointFunction(resp, query);
			
		})().error((e) => {
			
			if (e instanceof InputError)
				resp.statusCode = 400; // Bad Request
			else if (e instanceof InvalidTokenError)
				resp.statusCode = 401; // Unauthorized
			else
				resp.statusCode = 500; // Unknown Error
			
			console.log(e.name + (e.message ? ": " + e.message : ""));
			if (e.stack) console.log(e.stack);
			resp.setHeader("Content-Type", "text/plain");
			resp.write(e.name + (e.message ? ": " + e.message : ""));
			resp.end();
			
		});
	}

	private onError(err : Error) {
		console.log(err);
	}
}
