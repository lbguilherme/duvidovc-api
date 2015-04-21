import Server = require("./Server");

var server = new Server();
server.start();

process.on("SIGINT", () => {
	console.log("\rRequested to shutdown. Waiting for all remaining operations to finish.");
	server.stop();
});
