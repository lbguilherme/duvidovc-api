export = InputError;

class InputError implements Error {
	name : string
	message : string
	
	constructor(message? : string) {
		this.name = "InputError";
		this.message = message || "";
	}
}
