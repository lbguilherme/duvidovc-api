/// <reference path="../decl/source-map-support.d.ts" />
require("newrelic");
import SourceMapSupport = require("source-map-support"); SourceMapSupport.install();
import Server = require("./Server");
import DB = require("./DB");

process.title = "duvidovc-api"

DB.init(() => {

var server = new Server(80, "0.0.0.0");

	process.on("SIGINT", () => {
		console.log("\rRequested to shutdown.");
		console.log("Waiting current operations to finish...");
		server.stop();
		DB.close();
	});

});
