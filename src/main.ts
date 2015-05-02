import SourceMapSupport = require('source-map-support'); SourceMapSupport.install();
import KeyMetrics = require("./KeyMetrics"); KeyMetrics.init();
import Server = require("./Server");
import DB = require("./DB");

process.title = "duvidovc-api"

DB.init(() => {

	var server = new Server();
	server.start(5001, "localhost");

	process.on("SIGINT", () => {
		console.log("\rRequested to shutdown.");
		console.log("Waiting current operations to finish...");
		server.stop();
		DB.close();
	});

});