/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />
/// <reference path="../decl/gm.d.ts" />

export = Image;

import DB = require("./DB");
import InputError = require("./InputError");
import User = require("./Duvido.User");
import Data = require("./Duvido.Data");
import MongoDB = require("mongodb");
import GM = require("gm");
import Bluebird = require("bluebird");
import await = require("asyncawait/await");
import async = require("asyncawait/async");
import Crypto = require("crypto");

class Image {
	id : string;

	constructor(id : string) {
		this.id = id;
	}
	
	static create(owner : User, orientation : number, data : Buffer) {
		var hash = Crypto.createHash("sha512");
		hash.update(data);
		var sha512 = hash.digest("hex");
		var existing = DB.images.findOne({id: sha512}, {_id: 1});
		if (existing)
			return new Image(sha512);
		
		var imageData : DB.Image = {
			id: sha512,
			links: 0,
			time: new Date,
			owner: owner.id,
			width: 0,
			height: 0,
			sizes: []
		};
		
		if (orientation % 90 != 0)
			throw new InputError("Invalid orientation");
			
		var img = GM(data);
		
		await(new Bluebird.Promise((resolve, reject) => {
			img.size((err, size) => {
				if (err) {reject(err); return;}
				imageData.width = size.width;
				imageData.height = size.height;
				resolve(null);
			});
		}));
		
		var toDoSizes : number[] = [imageData.width];
		for (var w = 250; w < imageData.width; w = (w*2.5)|0)
			toDoSizes.push(w);
			
		await(toDoSizes.map(w => {
			return new Bluebird.Promise<void>((resolve, reject) => {
				var h = imageData.height/imageData.width*w;
				var scaled = w == imageData.width ? img : img.scale(w, h);
				scaled.quality(70).toBuffer("JPEG", (err, buffer) => {
					if (err) {reject(err); return;}
					async(() => {
						imageData.sizes.push({
							width: w,
							dataId: Data.create(buffer).id
						});
					})().done(resolve, reject);
				});
			});
		}));
		
		DB.images.insertOne(imageData);
		return new Image(imageData.id);
	}
	
	exists() {
		var image = DB.images.findOne({id: this.id}, {_id: 1});
		return !!image;
	}
	
	getOwner() {
		var image = DB.images.findOne({id: this.id}, {_id: 0, owner: 1});
		return image.owner;
	}
}