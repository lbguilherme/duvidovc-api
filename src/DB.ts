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
		this.users = db.collection("users");
		this.connectedCallback();
	}

}
