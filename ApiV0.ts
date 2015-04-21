export = ApiV0;

import Http = require("http"); 	
import ApiBase = require("./ApiBase");

class ApiV0 extends ApiBase {

	"/hello/world" = function(resp : Http.ServerResponse) {
		resp.write("Hi");
	}

}