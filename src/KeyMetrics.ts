import Pmx = require("pmx");
import ChildProcess = require("child_process");

export function init() {
	if (!process.send) return;

	Pmx.init();

	Pmx.action("git status", (reply) => {
		ChildProcess.exec("git status", (error : Error, stdout : Buffer, stderr : Buffer) => {
			reply({error: error, stdout: stdout.toString(), stderr: stderr.toString()});
		})
	});

	Pmx.action("git pull", (reply) => {
		ChildProcess.exec("git pull", (error : Error, stdout : Buffer, stderr : Buffer) => {
			reply({error: error, stdout: stdout.toString(), stderr: stderr.toString()});
		})
	});

	Pmx.action("build", (reply) => {
		ChildProcess.exec("make js/main.js", (error : Error, stdout : Buffer, stderr : Buffer) => {
			reply({error: error, stdout: stdout.toString(), stderr: stderr.toString()});
		})
	});

	Pmx.action("gc", (reply) => {
		reply(global.gc());
	});
}
