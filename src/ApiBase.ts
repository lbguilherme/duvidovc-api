export = ApiBase;

import Http = require("http");
import Tracker = require("./Tracker");

class ApiBase {
	[endpoint: string]: (tracker : Tracker, params : any, resp : Http.ServerResponse) => void;
	
	fail(tracker : Tracker, message : string, resp : Http.ServerResponse) {
		if (message.indexOf("OAuthException") != -1)
			resp.statusCode = 401;
		else
			resp.statusCode = 500;
		
		resp.setHeader("Content-Type", "text/plain");
		resp.write("Error: " + message);
		resp.end();
		tracker.end();
	}
}
