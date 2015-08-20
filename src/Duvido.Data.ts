export = Data;

import DB = require("./DB");
import Crypto = require("crypto");

class Data {
	id : string;

	constructor(id : string) {
		this.id = id;
	}
	
	static create(data : Buffer) {
		var hash = Crypto.createHash("sha512");
		hash.update(data);
		var sha512 = hash.digest("hex");
		if (DB.DataTable.exists(sha512))
			return new Data(sha512);
		
		var entry : DB.Data = {
			id: sha512,
			data: data
		};
		
		DB.DataTable.insert(entry);
		return new Data(entry.id);
	}
	
	exists() {
		return DB.DataTable.exists(this.id);
	}
	
	getBuffer() {
		return DB.DataTable.fetch(this.id).data;
	}
}
