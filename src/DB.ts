export = DB;

import Cassandra = require("cassandra-driver");
import Bluebird = require("bluebird");
import await = require("asyncawait/await");

class DB {
	static client : Cassandra.Client

	static init() {
		var options : Cassandra.ClientOptions = {
			contactPoints: [
				"cassandra"
			],
			keyspace: "duvido"
		}
		
		DB.client = new Cassandra.Client(options);
		
		// Tries to connect in a loop. Database server may be still loading
		var attempt = 1;
		while (true) {
			try {
				await(new Bluebird.Promise<void>((resolve, reject) => {
					DB.client.connect((err) => {
						if (err) reject(err);
						else resolve(null);
					});
				}));
				break;
			}
			catch (e) {
				console.error(e);
				console.log("Failed attempt " + attempt);
				attempt++;
				await(new Bluebird.Promise<void>((resolve, reject) => {
					setTimeout(resolve, 500);
				}));
			}
		}
	}
	
	static execute(query : string, params? : any[]) {
		return await(new Bluebird.Promise<Cassandra.ResultSet>((resolve, reject) => {
			DB.client.execute(query, params, { prepare : true }, (err, result) => {
				console.log(query + " " + JSON.stringify(params));
				if (err) reject(err);
				else {console.log(result.rows); resolve(result);}
			})
		}));
	}
	
}

module DB {
	
	export interface Data {
		id : string
		data : Buffer
	}
	
	export interface Token {
		accessToken : string
		userId : string
		expiresAt : Date,
		scopes : string[]
	};
	
	export interface User {
		id : string
		avatarDataId : string
		friends : string[]
		name : string
		firstName : string
		lastName : string
		gender : string
		birthday : Date
		email : string
		gcmTokens : string[]
	}
	
	export interface Action {
		user : string
		action : string
		object : string
		param : string
		ip : string
		time : Date
		token : string
	}
	
	export interface Image {
		id : string
		time : Date
		owner : string
		width : number
		height : number
		sizes : {[width : number] : string}
	}
	
	export interface Challenge {
		id : string
		owner : string
		title : string
		details : string
		reward : string
		duration : number
		imageId : string
		videoId : string
		time : Date
	}
	
	export interface Target {
		challenge : string
		id : string
		status : string // "sent" | "received" | "submitted" | "accepted" | "refused" | "expired"
	}
	
	export interface Submission {
		challenge : string
		target : string
		id : string
		status : string // "waiting" | "accepted" | "rejected"
		text : string
		imageId : string
		videoId : string
		sentTime : Date
		judgedTime : Date
	}
	
	class GenericTableClass<T> {
		constructor(protected table : string, protected columns : string[], protected key? : string) {}
		fixFields(object : {}) {
			this.columns.forEach(column => {
				var value = (<any>object)[column.toLowerCase()];
				delete (<any>object)[column.toLowerCase()];
				(<any>object)[column] = value;
			});
			return <T>object;
		}
		insert(data : T) {
			var rawData = <any>data;
			DB.execute("INSERT INTO "+this.table+" ("+this.columns.join(", ")+") VALUES ("+this.columns.map(()=>{return "?";}).join(", ")+");",
				this.columns.map(column => {return rawData[column];}));
		}
		exists(key : string) {return !!this.fetch(key);}
		fetch(key : string) {
			if (!this.key) throw new Error("Can't fetch if there is no key");
			var row = DB.execute("SELECT * FROM "+this.table+" WHERE "+this.key+"=?", [key]).first();
			return row ? this.fixFields(row) : null;
		}
		set(key : string, field : string, value : any) {
			DB.execute("UPDATE "+this.table+" SET "+field+"=? WHERE "+this.key+"=?;", [value, key]);
		}
		addToSet(key : string, field : string, value : any) {
			DB.execute("UPDATE "+this.table+" SET "+field+"="+field+"+? WHERE "+this.key+"=?;", [[value], key]);
		}
		query(field : string, value : any) : T[] {
			var rows = DB.execute("SELECT * FROM "+this.table+" WHERE "+field+"=?", [value]).rows;
			return rows.map(row => {return this.fixFields(row);});
		}
	}
	
	class TokensTableClass extends GenericTableClass<Token> {
		constructor() {super("tokens", ["accessToken", "userId", "expiresAt", "scopes"], "accessToken");}
	}
	
	class UsersTableClass extends GenericTableClass<User> {
		constructor() {super("users", ["id", "avatarDataId", "friends", "firstName", "lastName",
			"gender", "birthday", "email", "gcmTokens"], "id");}
	}
	
	class ActionsTableClass extends GenericTableClass<Action> {
		constructor() {super("actions", ["user", "action", "object", "param", "ip", "time", "token"], "id");}
		insert(data : Action) {
			var rawData = <any>data;
			DB.execute("INSERT INTO "+this.table+" (id, "+this.columns.join(", ")+") VALUES (uuid(), "+this.columns.map(()=>{return "?";}).join(", ")+");",
				this.columns.map(column => {return rawData[column];}));
		}
	}
	
	class DataTableClass extends GenericTableClass<Data> {
		constructor() {super("data", ["id", "data"], "id");}
	}
	
	class ImagesTableClass extends GenericTableClass<Image> {
		constructor() {super("images", ["id", "time", "owner", "width", "height", "sizes"], "id");}
	}
	
	class ChallengesTableClass extends GenericTableClass<Challenge> {
		constructor() {super("challenges", ["id", "owner", "title", "details", "reward", "duration", "imageId", "videoId", "time"], "id");}
	}
	
	class TargetsTableClass extends GenericTableClass<Target> {
		constructor() {super("targets", ["challenge", "id", "status"]);}
		markAs(challenge : string, target : string, status : string) {
			DB.execute("UPDATE targets SET status=? WHERE challenge=? AND id=?;", [status, challenge, target]);
		}
	}
	
	class SubmissionsTableClass extends GenericTableClass<Submission> {
		constructor() {super("submissions", ["challenge", "target", "id", "status", "text", 
			"imageId", "videoId", "sentTime", "judgedTime"], "id");}
	}
	
	export var TokensTable = new TokensTableClass();
	export var UsersTable = new UsersTableClass();
	export var ActionsTable = new ActionsTableClass();
	export var DataTable = new DataTableClass();
	export var ImagesTable = new ImagesTableClass();
	export var ChallengesTable = new ChallengesTableClass();
	export var TargetsTable = new TargetsTableClass();
	export var SubmissionsTable = new SubmissionsTableClass();
	
}

/* Database Schema

CREATE TABLE tokens (
	accessToken text PRIMARY KEY,
	userId text,
	expiresAt timestamp,
	scopes set<text>
);

CREATE TABLE users (
	id text PRIMARY KEY,
	avatarDataId text,
	friends set<text>,
	name text,
	firstName text,
	lastName text,
	gender text,
	birthday timestamp,
	email text,
	gcmTokens set<text>
);

CREATE TABLE actions (
	id uuid PRIMARY KEY,
	user text,
	action text,
	object text,
	param text,
	ip text,
	time timestamp,
	accessToken text
);

CREATE TABLE data (
	id text PRIMARY KEY,
	data blob
);

CREATE TABLE images (
	id text PRIMARY KEY,
	time timestamp,
	owner text,
	width int,
	height int,
	sizes map<int, text>
);

CREATE TABLE challenges (
	id text PRIMARY KEY,
	owner text,
	title text,
	details text,
	reward text,
	duration int,
	imageId text,
	videoId text,
	time timestamp
);
CREATE INDEX ON challenges (owner);

CREATE TABLE targets (
	challenge text,
	id text,
	status text,
  	PRIMARY KEY (challenge, id)
);
CREATE INDEX ON targets (id);

CREATE TABLE submissions (
	challenge text,
	target text,
	id text,
	status text,
	text text,
	imageId text,
	videoId text,
	sentTime timestamp,
	judgedTime timestamp,
	PRIMARY KEY (challenge, target, id)
);

*/
