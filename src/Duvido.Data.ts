/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />

export = Data;

import DB = require("./DB");
import InputError = require("./InputError");
import User = require("./Duvido.User");
import MongoDB = require("mongodb");
import UUID = require("node-uuid");
import Crypto = require('crypto');

class Data {
	id : string;

	constructor(id : string) {
		this.id = id;
	}
	
	static create(data : Buffer) {
		var hash = Crypto.createHash("sha512");
		hash.update(data);
		var sha512 = hash.digest("hex");
		var existing = DB.data.findOne({sha512: sha512});
		if (existing)
			return new Data(existing.id);
		
		var entry : DB.Data = {
			id: UUID.v4().replace(/-/g, ""),
			links: 0,
			sha512: sha512,
			data: new MongoDB.Binary(data)
		};
		
		DB.data.insertOne(entry);
		return new Data(entry.id);
	}
	
	exists() {
		var entry = DB.data.findOne({id: this.id}, {_id: 1});
		return !!entry;
	}
	
	incrementLinks() {
		DB.data.updateOne({id: this.id}, {$inc: {links: 1}});
	}
}
