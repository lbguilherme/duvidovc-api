export = DB;

import MongoDB = require("mongodb");

class DB {

	static url = "mongodb://127.0.0.1:27017/duvidovc";

	static connectedCallback : () => void;
	static db : MongoDB.Db;
	static users : MongoDB.Collection;

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
		this.users = db.collection("users")
		this.connectedCallback();
	}

}

module DB {

	export class User {

		userId : string;
		surelyExists = false;

		static get(userId : string) {
			var user = new User();
			user.userId = userId;
			return user;
		}

		private ensureExists(callback : (err : Error) => void) {
			if (this.surelyExists) return;
			DB.users.find({userId : this.userId}, function(err : Error, cur : MongoDB.Cursor) {
				if (err) {callback(err); return;}
				cur.count(false, function(err : Error, count : number) {
					if (err) {callback(err); return;}
					if (count == 0) this.insert(callback);
					else {this.surelyExists = true; callback(null);}
				}.bind(this));
			}.bind(this));
		}

		private insert(callback : (err : Error) => void) {
			DB.users.insertOne({userId : this.userId}, function (err : Error, res : any) {
				if (!err) this.surelyExists = true;
				callback(err);
			}.bind(this))
		}

		static findByToken(token : string, callback : (err : Error, user : User) => void) {
			DB.users.find({tokens : token}, function(err : Error, cur : MongoDB.Cursor) {
				if (err) {callback(err, null); return;}
				cur.toArray(function(err: Error, results: any[]) {
					if (err) {callback(err, null); return;}
					if (results.length == 0)
						callback(null, null);
					else
						callback(null, DB.User.get(results[0].userId));
				});
			});
		}

		addToken(token : string, callback : (err : Error) => void) {
			this.ensureExists(function(err : Error) {
				if (err) {callback(err); return;}
				DB.users.updateOne({userId : this.userId}, {$addToSet: { tokens: token }}, function(err : Error, res : any) {
					callback(err);
				}.bind(this));
			}.bind(this));
		}
		
	}

}
