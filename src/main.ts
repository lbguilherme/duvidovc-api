/// <reference path="../decl/source-map-support.d.ts" />
require("newrelic");
import * as SourceMapSupport from "source-map-support"; SourceMapSupport.install();
import { Server } from "Server";
import { DB } from "DB";

process.title = "duvidovc-api"

DB.init(() => {

	var server = new Server();
	server.start(80, "0.0.0.0");

	process.on("SIGINT", () => {
		console.log("\rRequested to shutdown.");
		console.log("Waiting current operations to finish...");
		server.stop();
		DB.close();
	});

});
