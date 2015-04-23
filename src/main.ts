import KeyMetrics = require("./KeyMetrics"); KeyMetrics.init();
import Server = require("./Server");

var server = new Server();
server.start(5001, "localhost");

process.title = "duvidovc-serve"

process.on("SIGINT", () => {
	console.log("\rRequested to shutdown.");
	console.log("Waiting current operations to finish...");
	server.stop();
});
