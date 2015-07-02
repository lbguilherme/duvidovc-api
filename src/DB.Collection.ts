/// <reference path="../decl/mongodb.d.ts" />

export = Collection;

import MongoDB = require("mongodb");
import Bluebird = require("bluebird");
import await = require("asyncawait/await");

class Collection<T> {
	collection : MongoDB.Collection;
	
	constructor(collection : MongoDB.Collection) {
		this.collection = collection;
	}
	
	updateOne(query : any, fields? : any) {
		if (!fields) fields = {};
		await(new Bluebird.Promise<void>((resolve, reject) => {
			this.collection.updateOne(query, fields, {upsert: true}, (err) => {
				if (err) reject(err); else resolve(null);
			});
		}));
	}
	
	updateOneAsync(query : any, fields? : any) {
		if (!fields) fields = {};
		this.collection.updateOne(query, fields, {upsert: true}, () => {});
	}
	
	findOne(query : any, fields? : any) {
		if (!fields) fields = {};
		return await(new Bluebird.Promise<T>((resolve, reject) => {
			this.collection.findOne(query, fields, (err, result) => {
				if (err) reject(err); else resolve(result);
			});
		}));
	}
	
	list(query : any, fields? : any) {
		if (!fields) fields = {};
		return await(new Bluebird.Promise<T[]>((resolve, reject) => {
			this.collection.find(query, fields, (err, result) => {
				if (err) { reject(err); return; }
				result.toArray((err, array) => {
					if (err) { reject(err); return; }
					resolve(array);
				});
			});
		}));
	}
	
	insertOne(object : T) {
		await(new Bluebird.Promise<void>((resolve, reject) => {
			this.collection.insertOne(object, (err) => {
				if (err) reject(err); else resolve(null);
			});
		}));
	}
}
