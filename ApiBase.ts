export = ApiBase;

import Http = require("http");

class ApiBase {
	[endpoint: string]: (resp : Http.ServerResponse) => void;
}