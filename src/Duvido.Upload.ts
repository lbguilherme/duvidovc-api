/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />

export = Upload;

import DB = require("./DB");
import User = require("./Duvido.User");
import MongoDB = require("mongodb");
import UUID = require("node-uuid");

class Upload {
	id : string;

	constructor(id : string) {
		this.id = id;
	}
	
	static create(owner : User, data : Buffer) {
		var uploadData : DB.Upload = {
			id: UUID.v4().replace(/-/g, ""),
			time: new Date,
			owner: owner.id,
			data: new MongoDB.Binary(data)
		}
		
		DB.uploads.insertOne(uploadData);
		return new Upload(uploadData.id);
	}
	
	exists() {
		var upload = DB.uploads.findOne({id: this.id}, {_id: 1});
		return !!upload;
	}
	
	getOwner() {
		var upload = DB.uploads.findOne({id: this.id}, {_id: 0, owner: 1});
		return upload.owner;
	}
}