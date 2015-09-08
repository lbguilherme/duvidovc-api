/// <reference path="../decl/node-uuid.d.ts" />

export = Challenge;

import DB = require("./DB");
import Utility = require("./Utility");
import User = require("./Duvido.User");
import Image = require("./Duvido.Image");
import UUID = require("node-uuid");
import await = require("asyncawait/await");
import async = require("asyncawait/async");
import InputError = require("./InputError");

module Challenge {
	export type CreationInfo = {
		owner : string,
		title: string,
		details : string,
		reward : string,
		targets : string[],
		duration : number,
		image : Image
	};
}

class Challenge {
	id : string;
	private data : DB.Challenge;
	private targets : DB.Target[];

	constructor(id : string) {
		this.id = id;
		this.refresh();
	}

	static create(info : Challenge.CreationInfo) {
		var challenge : DB.Challenge = {
			id: UUID.v4().replace(/-/g, ""),
			time: new Date,
			owner: info.owner,
			title: info.title,
			details: info.details,
			reward: info.reward,
			imageId: "",
			videoId: "",
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

		DB.ChallengesTable.insert(challenge);

		await(info.targets.map(id => {
			return async(() => {
				var target : DB.Target = {
					challenge: challenge.id,
					id: id,
					status: "sent"
				};
				DB.TargetsTable.insert(target);
			})();
		}));

		return challenge.id;
	}

	static listFromOwner(owner : User) {
		var list = DB.ChallengesTable.query("owner", owner.id);
		return list.map(data => {
			var c = new Challenge(data.id);
			c.data = data;
			return c;
		});
	}

	static listFromTarget(user : User) : Challenge[] {
		var targetList = DB.TargetsTable.query("id", user.id)
		targetList = targetList.filter(target => {return target.status == "sent" || target.status == "received"});
		return targetList.map(target => {
			return new Challenge(target.challenge);
		});
	}

	refresh() {
		if (this.hasExpired()) {
			this.getTargets().forEach(target => {
				if (target.status == "sent" || target.status == "received") {
					target.status = "expired";
					this.markExpired(new User(target.id));
				}
			});
		}
	}

	getData() {
		if (!this.data)
			this.data = DB.ChallengesTable.fetch(this.id);

		if (!this.data)
			throw new InputError("Invalid id");

		return this.data;
	}

	getTargets() {
		if (!this.targets)
			this.targets = DB.TargetsTable.query("challenge", this.id);
			

		return this.targets;
	}

	getTargetIds() {
		return this.getTargets().map(target => {return target.id});
	}

	hasExpired() {
		return this.getData().time.getTime()/1000 + this.getData().duration < new Date().getTime()/1000;
	}

	submitReply(user : User, image : Image) {
		var submission : DB.Submission = {
			challenge: this.id,
			target: user.id,
			id: UUID.v4(),
			status: "waiting",
			text: "",
			imageId: image.id,
			videoId: "",
			sentTime: new Date(),
			judgedTime: null
		};

		DB.SubmissionsTable.insert(submission);
		this.markSubmitted(user);
	}

	markReceived(user : User) {
		DB.TargetsTable.markAs(this.id, user.id, "received");
	}

	markRefused(user : User) {
		DB.TargetsTable.markAs(this.id, user.id, "refused");
	}

	markSubmitted(user : User) {
		DB.TargetsTable.markAs(this.id, user.id, "submitted");
	}

	markExpired(user : User) {
		DB.TargetsTable.markAs(this.id, user.id, "expired");
	}
}
