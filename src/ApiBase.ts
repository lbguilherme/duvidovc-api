export = ApiBase;

import Tracker = require("./Tracker");
import Http = require("http");

class ApiBase {
	[endpoint: string]: (tracker : Tracker, params : any, resp : Http.ServerResponse) => void;
}
