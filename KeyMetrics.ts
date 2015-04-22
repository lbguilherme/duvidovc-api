import Pmx = require("pmx");
import ChildProcess = require("child_process");

export function init() {
	Pmx.init();

	Pmx.action("git status", function(reply) {
		ChildProcess.exec("git status", function callback(error : Error, stdout : Buffer, stderr : Buffer){
			reply({error: error, stdout: stdout.toString(), stderr: stderr.toString()});
		})
	});

	Pmx.action("git pull", function(reply) {
		ChildProcess.exec("git pull", function callback(error : Error, stdout : Buffer, stderr : Buffer){
			reply({error: error, stdout: stdout.toString(), stderr: stderr.toString()});
		})
	});

	Pmx.action("build", function(reply) {
		ChildProcess.exec("make js/main.js", function callback(error : Error, stdout : Buffer, stderr : Buffer){
			reply({error: error, stdout: stdout.toString(), stderr: stderr.toString()});
		})
	});
}
