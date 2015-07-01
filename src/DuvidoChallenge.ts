/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />

export = Challenge;

import DB = require("DB");
import Utility = require("Utility");
import MongoDB = require("mongodb");
import UUID = require("node-uuid");
import User = require("DuvidoUser");
import Upload = require("DuvidoUpload");

module Challenge {
	export type CreationInfo = {
		owner : string,
		title: string,
		description : string,
		reward : string,
		targets : string[],
		duration : number,
		image? : Upload
	};
}

class Challenge {
	id : string;
	data : DB.Challenge;
	
	constructor(id : string) {
		this.id = id;
	}
	
	static create(info : Challenge.CreationInfo, callback : (err : Error, id : string) => void) {
		var challenge : DB.Challenge = {
			id: UUID.v4().replace(/-/g, ""),
			creationTime: new Date,
			owner: info.owner,
			title: info.title,
			description: info.description,
			reward: info.reward,
			targets: info.targets.map(id => {return {
				id: id,
				status: "sent",
				submissions: []
			};}),
			duration: info.duration
		}
		
		function finish() {
			DB.challenges.insertOne(challenge, (err) => {
				if (err) { callback(err, null); return; }
				callback(null, challenge.id);
			});
		}
		
		function checkChallengeAndTargets() {
			info.image.checkExists((err, exists) => {
				if (err) { callback(err, null); return; }
				if (!exists) { callback(new Error("Challenge image does not exist"), null); return; }
				checkTargets();
			});
		}
		
		function checkTargets() {
			var valid = true;
			Utility.doForAll(info.targets.length, (i, done) => {
				var id = info.targets[i];
				new User(id).checkExists((err, exists) => {
					if (err) { callback(err, null); return; }
					if (!exists) valid = false;
					done();
				});
			}, () => {
				if (valid) {
					finish();
				} else {
					callback(new Error("One of the target ids does not exist"), null);
				}
			});
			
		}
		
		if (info.image) {
			challenge.image = info.image.id;
			checkChallengeAndTargets();
		} else {
			checkTargets();
		}
	}
	
	static listFromOwner(owner : string, callback : (err : Error, list : Challenge[]) => void) {
		DB.challenges.find({owner: owner}, {_id: 0}, (err, result) => {
			if (err) { callback(err, null); return; }
			result.toArray((err, array) => {
				if (err) { callback(err, null); return; }
				callback(null, array.map(data => {
					var challenge = new Challenge(data.id);
					challenge.data = data
					return challenge;
				}));
			});
		});
	}
	
	getData(callback : (err : Error, data : DB.Challenge) => void) {
		if (this.data)
			callback(null, this.data);
		else {
			DB.challenges.findOne({id: this.id}, {_id: 0}, (err, data) => {
				if (err) { callback(err, null); return; }
				if (!data) { callback(new Error, null); return; }
				callback(null, this.data = data);
			});
		}
	}
}