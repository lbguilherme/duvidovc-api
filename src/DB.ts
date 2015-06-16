export = DB;

import MongoDB = require("mongodb");

class DB {

	static url = "mongodb://127.0.0.1:60001/duvidovc";

	static connectedCallback : () => void;
	static db : MongoDB.Db;
	static users : DB.Collection<DB.User>;
	static tokens : DB.Collection<DB.Token>;
	static challenges : DB.Collection<DB.Challenge>;
	static uploads : DB.Collection<DB.Upload>;

	static init(callback : () => void) {
		console.log("Connecting to database at '%s' ...", DB.url);
		this.connectedCallback = callback;
		MongoDB.MongoClient.connect(DB.url, this.onConnected.bind(this));
	}

	static close() {
		this.db.close();
	}

	static onConnected(err : Error, db : MongoDB.Db) {
		if (err) {
			console.log("fatal: failed to connect to database: " + err.message);
			return;
		}

		this.db = db;
		this.users = db.collection("users");
		this.tokens = db.collection("tokens");
		this.challenges = db.collection("challenges");
		this.uploads = db.collection("uploads");
		this.connectedCallback();
	}

}

module DB {
	export interface Collection<T> extends MongoDB.Collection {
		insertOne(query : T, callback : (err : Error, result : T) => void) : void;
		insertOne(query : T, options : { safe? : any; continueOnError? : boolean; keepGoing? : boolean; serializeFunctions? : boolean; }, callback : (err : Error, result : T) => void) : void;

		updateOne(selector : Object, document : any, callback? : (err : Error) => void) : void;
		updateOne(selector : Object, document : any, options : { safe? : boolean; upsert? : any; multi? : boolean; serializeFunctions? : boolean; }, callback? : (err : Error) => void) : void;

		findOne(callback? : (err : Error, result : T) => void) : MongoDB.Cursor;
		findOne(selector : Object, callback? : (err : Error, result : T) => void) : MongoDB.Cursor;
		findOne(selector : Object, fields : any, callback? : (err : Error, result : T) => void) : MongoDB.Cursor;
		findOne(selector : Object, options : MongoDB.CollectionFindOptions, callback? : (err : Error, result : T) => void) : MongoDB.Cursor;
		findOne(selector : Object, fields : any, options : MongoDB.CollectionFindOptions, callback? : (err : Error, result : T) => void) : MongoDB.Cursor;
		findOne(selector : Object, fields : any, skip : number, limit : number, callback? : (err : Error, result : T) => void) : MongoDB.Cursor;
		findOne(selector : Object, fields : any, skip : number, limit : number, timeout : number, callback? : (err : Error, result : T) => void) : MongoDB.Cursor;
	}
	
	export interface Token {
		token : string
		userId : string
		expireTime? : Date
	};
	
	export interface User {
		firstLogin : Date
		lastLogin : Date
		id : string
		avatar? : MongoDB.Binary
		friends? : string[]
		name? : string
	}
	
	export interface Upload {
		time : Date
		id : string
		owner : string
		data : MongoDB.Binary
	}
	
	export interface Challenge {
		creationTime : Date
		id : string
		owner : string
		title : string
		description : string
		reward : string
		targets : string[]
		duration : number
		image? : MongoDB.Binary
	}
}
