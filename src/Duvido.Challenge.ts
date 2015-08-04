/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />

export = Challenge;

import DB = require("./DB");
import Utility = require("./Utility");
import User = require("./Duvido.User");
import Image = require("./Duvido.Image");
import MongoDB = require("mongodb");
import UUID = require("node-uuid");
import await = require("asyncawait/await");
import async = require("asyncawait/async");

module Challenge {
	export type CreationInfo = {
		owner : string,
		title: string,
		description : string,
		reward : string,
		targets : string[],
		duration : number,
		image : Image
	};
}

class Challenge {
	id : string;
	data : DB.Challenge;
	
	constructor(id : string) {
		this.id = id;
	}
	
	static create(info : Challenge.CreationInfo) {
		var challenge : DB.Challenge = {
			id: UUID.v4().replace(/-/g, ""),
			creationTime: new Date,
			owner: info.owner,
			title: info.title,
			description: info.description,
			reward: info.reward,
			imageId: "",
			videoId: "",
			targets: info.targets.map(id => {return {
				id: id,
				status: "sent",
				submissions: []
			};}),
			duration: info.duration
		}
		
		if (info.targets.length == 0) {
			throw new Error("");
		}
		
		if (info.image) {
			if (!info.image.exists())
				throw new Error("Challenge image does not exist");
			challenge.imageId = info.image.id;
		}
		
		await(info.targets.map(id => {
			return async(() => {
				if (!new User(id).exists())
					throw new Error("One of the target ids does not exist");
			})();
		}));
		
		DB.challenges.insertOne(challenge);
		return challenge.id;
	}
	
	static listFromOwner(owner : User) {
		var list = DB.challenges.list({owner: owner.id}, {_id: 0});
		return list.map(data => {
			var challenge = new Challenge(data.id);
			challenge.data = data
			return challenge;
		});
	}
	
	static listFromTarget(target : User) {
		var list = DB.challenges.list({targets: {$elemMatch: {$and: [{id: target.id}, {$or: [{status: "sent"}, {status: "received"}]}]}}}, {_id: 0});
		return list.map(data => {
			var challenge = new Challenge(data.id);
			challenge.data = data
			return challenge;
		});
	}
	
	getData() {
		if (this.data)
			return this.data;
		else
			return this.data = DB.challenges.findOne({id: this.id}, {_id: 0});
	}
	
	refuse(user : User) {
		var challenge = DB.challenges.findOne({id: this.id}, {_id: 0, targets: 1});
		
		if (!challenge)
			return;
		
		challenge.targets.forEach(target => {
			if (target.id == user.id && target.status == "received") {
				target.status = "refused";
			}
		});
		
		DB.challenges.updateOne({id: this.id}, {$set: {targets: challenge.targets}});
	}
}
