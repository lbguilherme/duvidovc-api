import Pmx = require("pmx");
import ChildProcess = require("child_process");

export function init() {
	Pmx.init();

	Pmx.action("build", function(reply) {
		ChildProcess.exec("make js/main.js", function callback(error : Error, stdout : Buffer, stderr : Buffer){
			reply({error: error, stdout: stdout.toString(), stderr: stderr.toString()});
		})
	});
}
