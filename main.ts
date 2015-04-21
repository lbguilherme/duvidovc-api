import Server = require("./Server");

var server = new Server();
server.start(3000);

process.on("SIGINT", () => {
	console.log("\rRequested to shutdown. Waiting for all remaining operations to finish.");
	server.stop();
});
