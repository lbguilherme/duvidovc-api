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
		hash.update(orientation+"");
		hash.update("v3"); // ignore old caches
		var sha512 = hash.digest("hex");
		if (DB.ImagesTable.exists(sha512))
			return new Image(sha512);

		var imageData : DB.Image = {
			id: sha512,
			time: new Date,
			owner: owner.id,
			width: 0,
			height: 0,
			sizes: {}
		};

		if (orientation % 90 != 0)
			throw new InputError("Invalid orientation");

		var img = GM.subClass({nativeAutoOrient: true})(data);

		await(new Bluebird.Promise((resolve, reject) => {
			img.autoOrient().rotate("white", orientation).toBuffer((err, buffer) => {
				if (err) {reject(err); return;}
				img = GM(buffer);
				resolve(null);
			});
		}));

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
				var out = img;
				if (w != imageData.width) out = out.scale(w, 9999);
				out.quality(70).toBuffer("JPEG", (err, buffer) => {
					if (err) {reject(err); return;}
					async(() => {
						imageData.sizes[w] = Data.create(buffer).id;
					})().done(resolve, reject);
				});
			});
		}));

		DB.ImagesTable.insert(imageData);
		return new Image(imageData.id);
	}

	exists() {
		return DB.ImagesTable.exists(this.id);
	}

	getOwner() {
		return new User(DB.ImagesTable.fetch(this.id).owner);
	}

	getDataIdForSize(size : number) {
		var image = DB.ImagesTable.fetch(this.id);
		var sizes = Object.keys(image.sizes).map(str => {return parseInt(str);});
		var currentBest = sizes[0];
		sizes.forEach(width => {
			if (width < size && currentBest < width)
				currentBest = width;
			if (width > size && currentBest < size)
				currentBest = width;
			if (width > size && currentBest > size && currentBest > width)
				currentBest = width;
		});
		return image.sizes[currentBest];
	}

	getRatio() {
		var image = DB.ImagesTable.fetch(this.id);
		return image.width / image.height;
	}
}
