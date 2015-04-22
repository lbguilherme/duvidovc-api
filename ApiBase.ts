export = ApiBase;

import Http = require("http");

class ApiBase {
	[endpoint: string]: any;

	fail(resp : Http.ServerResponse, message : string) {
		resp.statusCode = 400;
		resp.write(JSON.stringify({error: message}));
		resp.end();
	}
}
