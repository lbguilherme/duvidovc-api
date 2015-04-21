export = Server;

import Http = require("http");
import Url = require("url");
import ApiVersions = require("./ApiVersions");

class Server {
	
	private server : Http.Server;

	constructor() {
		this.server = Http.createServer();
		this.server.addListener("request", this.handleRequest.bind(this));
		this.server.addListener("error", this.handleError.bind(this));
	}

	start() {
		this.server.listen(3000, function () {
			var host = this.server.address().address;
			var port = this.server.address().port;
			console.log("Listening at http://%s:%s", host, port);
		}.bind(this));
	}
	
	private handleRequest(msg : Http.IncomingMessage, resp : Http.ServerResponse) {
		var request = Url.parse(msg.url, true);
		var path = request.pathname.split("/");
		var api = ApiVersions[path[1]];
		var endpoint = "/" + path.slice(2).join("/");

		if (!api) {
			resp.statusCode = 404;
		} else {
			var endpointFunction = api[endpoint];
			if (!endpointFunction) {
				resp.statusCode = 404;
			} else {
				api[endpoint](resp);
			}
		}

		resp.end();
	}

	private handleError(err : Error) {
		console.log(err);
	}
}
