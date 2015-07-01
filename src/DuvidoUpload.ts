/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />

export { Upload };

import * as MongoDB from "mongodb";
import { DB } from "DB";
import { User } from "DuvidoUser";
import UUID from "node-uuid";

class Upload {
	id : string;

	constructor(id : string) {
		this.id = id;
	}
	
	static create(owner : User, data : Buffer, callback : (err : Error, upload : Upload) => void) {
		var uploadData : DB.Upload = {
			id: UUID.v4().replace(/-/g, ""),
			time: new Date,
			owner: owner.id,
			data: new MongoDB.Binary(data)
		}
		DB.uploads.insertOne(uploadData, (err) => {
			if (err) { callback(err, null); return; }
			callback(null, new Upload(uploadData.id));
		});
	}
	
	checkExists(callback : (err : Error, exists : boolean) => void) {
		DB.uploads.findOne({id : this.id}, {_id: 1}, (err, upload) => {
			if (err) { callback(err, null); return; }
			if (upload) {
				callback(null, true);
			} else {
				callback(null, false);
			}
		});
	}
	
	getOwner(callback : (err : Error, owner : User) => void) {
		DB.uploads.findOne({id : this.id}, {_id: 0, owner: 1}, (err, upload) => {
			if (err) { callback(err, null); return; }
			if (upload) {
				callback(null, new User(upload.owner));
			} else {
				callback(null, null);
			}
		});
	}
	
	getData(callback : (err : Error, owner : User, data : MongoDB.Binary) => void) {
		DB.uploads.findOne({id : this.id}, {_id: 0, owner: 1, data: 1}, (err, upload) => {
			if (err) { callback(err, null, null); return; }
			if (upload) {
				callback(null, new User(upload.owner), upload.data);
			} else {
				callback(null, null, null);
			}
		});
	}
}