export = ApiBase;

import Http = require("http");

class ApiBase {
	[endpoint: string]: any;

	fail(resp : Http.ServerResponse, status : number, message : string) {
		resp.statusCode = status;
		resp.write(JSON.stringify({error: message}));
		resp.end();
	}
}
