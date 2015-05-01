export = ApiBase;

import Http = require("http");

class ApiBase {
	[endpoint: string]: (params : any, resp : Http.ServerResponse) => void;
}
