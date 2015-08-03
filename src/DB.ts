export = DB;

import MongoDB = require("mongodb");
import Bluebird = require("bluebird");
import await = require("asyncawait/await");


function connectDb(url : string) {
	return await(new Bluebird.Promise<MongoDB.Db>((resolve, reject) => {
		MongoDB.MongoClient.connect(url, (err, db) => {
			if (err) reject(err); else resolve(db);
		});
	}));
} 

class DB {

	static url = "mongodb://duvidovc.mongodb:27017/";
	
	static mainDb : MongoDB.Db;
	static dataDb : MongoDB.Db;
	
	static data : DB.Collection<DB.Data>;
	static users : DB.Collection<DB.User>;
	static tokens : DB.Collection<DB.Token>;
	static challenges : DB.Collection<DB.Challenge>;
	static images : DB.Collection<DB.Image>;

	static init() {
		DB.mainDb = connectDb(DB.url + "main");
		DB.dataDb = connectDb(DB.url + "data");
		
		DB.data = new DB.Collection<DB.Data>(DB.dataDb.collection("data"));
		DB.users = new DB.Collection<DB.User>(DB.mainDb.collection("users"));
		DB.tokens = new DB.Collection<DB.Token>(DB.mainDb.collection("tokens"));
		DB.challenges = new DB.Collection<DB.Challenge>(DB.mainDb.collection("challenges"));
		DB.images = new DB.Collection<DB.Image>(DB.mainDb.collection("images"));
	}
	
}

import DBCollection = require("./DB.Collection");

module DB {
	
	export class Collection<T> extends DBCollection<T> {}
	
	export interface Data {
		id : string
		links : number
		data : MongoDB.Binary
	}
	
	export interface Token {
		token : string
		userId : string
		expiresAt : Date,
		permissions : string[]
	};
	
	export interface User {
		id : string
		avatarDataId : string
		friends : string[]
		name : string
		firstName : string
		lastName : string
		gender : string
		birthday : string
		email : string
		gcmTokens : string[]
	}
	
	export interface Image {
		id : string
		links : number
		time : Date
		owner : string
		width : number
		height : number
		sizes : {
			width : number
			dataId : string
		}[]
	}
	
	export interface Challenge {
		creationTime : Date
		id : string
		owner : string
		title : string
		description : string
		reward : string
		duration : number
		imageId : string
		videoId : string
		targets : {
			id : string
			status : string // "sent" | "received" | "submitted" | "rewarded" | "refused"
			submissions : {
				status : string // "waiting" | "accepted" | "rejected"
				text : string
				imageId : string
				videoId : string
				sentTime : Date
				judgedTime : Date
			}[]
		}[]
	}
}
