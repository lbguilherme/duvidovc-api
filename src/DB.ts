export = DB;

import MongoDB = require("mongodb");

class DB {

	static url = "mongodb://duvidovc.mongodb:27017/duvidovc";

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
		this.users = new DB.Collection<DB.User>(db.collection("users"));
		this.tokens = new DB.Collection<DB.Token>(db.collection("tokens"));
		this.challenges = new DB.Collection<DB.Challenge>(db.collection("challenges"));
		this.uploads = new DB.Collection<DB.Upload>(db.collection("uploads"));
		this.connectedCallback();
	}

}

import DBCollection = require("./DB.Collection");

module DB {
	
	export class Collection<T> extends DBCollection<T> {}
	
	export interface Token {
		token : string
		userId : string
		expireTime? : Date
	};
	
	export interface User {
		firstLogin : Date
		lastLogin : Date
		id : string
		avatar : MongoDB.Binary
		friends : string[]
		name : string
		firstName : string
		lastName : string
		gender : string
		birthday : string
		email : string
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
		duration : number
		image? : string
		targets : {
			id : string
			status : string // "sent" | "received" | "read" | "submitted" | "rewarded"
			submissions : {
				status : string // "waiting" | "accepted" | "rejected"
				text : string
				image : string
				sentTime : Date
				judgedTime : Date
			}[]
		}[]
	}
}
