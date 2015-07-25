/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />

export = Data;

import DB = require("./DB");
import InputError = require("./InputError");
import User = require("./Duvido.User");
import MongoDB = require("mongodb");
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
		var existing = DB.data.findOne({id: sha512}, {_id: 1});
		if (existing)
			return new Data(sha512);
		
		var entry : DB.Data = {
			id: sha512,
			links: 0,
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
	
	getBuffer() {
		var entry = DB.data.findOne({id: this.id}, {_id: 0, data: 1});
		return entry.data.read(0, entry.data.length());
	}
}
