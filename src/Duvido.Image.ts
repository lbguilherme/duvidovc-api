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
			
		var img = GM.subClass({nativeAutoOrient: true})(data);
		
		await(new Bluebird.Promise((resolve, reject) => {
			img.size((err, size) => {
				if (err) {reject(err); return;}
				imageData.width = size.width;
				imageData.height = size.height;
				resolve(null);
			});
		}));
		
		var toDoSizes : number[] = [imageData.width];
		for (var w = 250; w < imageData.width; w = (w*1.8)|0)
			toDoSizes.push(w);
			
		await(toDoSizes.map(w => {
			return new Bluebird.Promise<void>((resolve, reject) => {
				var out = img.autoOrient().rotate("white", orientation);
				if (w != imageData.width) out = out.scale(w, 9999);
				out.quality(70).toBuffer("JPEG", (err, buffer) => {
					if (err) {reject(err); return;}
					async(() => {
						var data = Data.create(buffer);
						data.incrementLinks();
						imageData.sizes.push({
							width: w,
							dataId: data.id
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
	
	getDataIdForSize(size : number) {
		var image = DB.images.findOne({id: this.id}, {_id: 0, sizes: 1});
		var currentBest = image.sizes[0];
		image.sizes.forEach(entry => {
			if (entry.width < size && currentBest.width < entry.width)
				currentBest = entry;
			if (entry.width > size && currentBest.width < size)
				currentBest = entry;
			if (entry.width > size && currentBest.width > size && currentBest.width > entry.width)
				currentBest = entry;
		});
		return currentBest.dataId;
	}
	
	getRatio() {
		var image = DB.images.findOne({id: this.id}, {_id: 0, width: 1, height: 1});
		return image.width / image.height;
	}
}
