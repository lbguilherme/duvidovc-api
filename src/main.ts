/// <reference path="../decl/source-map-support.d.ts" />
require("newrelic");
import SourceMapSupport = require("source-map-support"); SourceMapSupport.install();
import Server = require("./Server");
import DB = require("./DB");
import async = require("asyncawait/async");

process.title = "duvidovc-api"

async(() => {
	
	DB.init();
	new Server(80, "0.0.0.0");

})();
