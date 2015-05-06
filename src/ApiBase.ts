export = ApiBase;

import Http = require("http");

class ApiBase {
	[endpoint: string]: (params : any, resp : Http.ServerResponse) => void;
	
	fail(message : string, resp : Http.ServerResponse) {
		resp.statusCode = 500;
		resp.write("Error: " + message);
		resp.end();
	}
}
