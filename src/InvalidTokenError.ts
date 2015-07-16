export = InvalidTokenError;

class InvalidTokenError implements Error {
	name : string
	message : string
	
	constructor(message? : string) {
		this.name = "InvalidTokenError";
		this.message = message || "";
	}
}
