/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node-uuid.d.ts" />

export = Duvido;

import DB = require("./DB");
import Facebook = require("./Facebook");
import Utility = require("./Utility");
import MongoDB = require("mongodb");
import UUID = require("node-uuid");

module Duvido {
	export class User {
		id : string;

		constructor(id : string) {
			this.id = id;
		}
		
		setFirstLoginIfNeededAsync() {
			DB.users.findOne({id : this.id}, (err, user) => {
				if (err || !user) return;
				if (user && user.firstLogin) return;
				DB.users.updateOne({id : this.id}, {$set: {firstLogin: Date.now()}}, {upsert: true});
			});
		}

		addTokenAsync(token : string) {
			var key = {token : token};
			var data = {$set: {token : token, userId : this.id}};
			DB.tokens.updateOne(key, data, {upsert: true});
			Facebook.fetchTokenInfo(token, (err, tokenInfo) => {
				if (err) {console.log(err); return;}
				var data = {$set: {token : token, expireTime : Date.now() + tokenInfo.expires_in}};
				DB.tokens.updateOne(key, data, {upsert: true});
			});
			this.setFirstLoginIfNeededAsync();
		}

		static fromToken(token : string, callback : (err : Error, user : User) => void) {
			DB.tokens.findOne({token : token}, (err, tokenInfo) => {
				if (err) { callback(err, null); return; }
				if (tokenInfo) {
					var user = new User(tokenInfo.userId);
					callback(null, user);
				} else {
					Facebook.fetchMe(token, (err, userInfo) => {
						if (err) { callback(err, null); return; }
						var user = new User(userInfo.id);
						callback(null, user);
						user.addTokenAsync(token);
						user.setNameAsync(userInfo.name);
					});
				}
			});
		}
		
		checkExists(callback : (err : Error, exists : boolean) => void) {
			DB.users.findOne({id : this.id}, {_id: 1}, (err, user) => {
				if (err) { callback(err, null); return; }
				if (user) {
					callback(null, true);
				} else {
					callback(null, false);
				}
			});
		}

		getToken(callback : (err : Error, token : string) => void) {
			DB.tokens.findOne({userId : this.id}, (err, tokenInfo) => {
				if (err) { callback(err, null); return; }
				if (tokenInfo) {
					callback(null, tokenInfo.token);
				} else {
					callback(new Error("no token available for this user"), null);
				}
			});
		}
		
		setLastLoginAsync() {
			DB.users.findOne({id : this.id}, (err, user) => {
				if (err) return;
				if (!user) return;
				DB.users.updateOne({id : this.id}, {$set: {lastLogin: Date.now()}}, {upsert: true});
			});
		}

		setAvatarAsync(avatar : MongoDB.Binary) {
			var key = {id : this.id};
			var data = {$set: {id : this.id, avatar: avatar}};
			DB.users.findOne(key, (err, user) => {
				if (user)
					DB.users.updateOne(key, data, {upsert: true});
			});
		}

		getAvatar(callback : (err : Error, buf : Buffer) => void) {
			DB.users.findOne({id : this.id}, (err, user) => {
				if (err) { callback(err, null); return; }
				if (user && user.avatar) {
					var data : MongoDB.Binary = user.avatar;
					var buff = data.read(0, data.length());
					callback(null, buff);
				} else {
					Facebook.fetchAvatar(this.id, (err, buff) => {
						if (err) { callback(err, null); return; }
						callback(null, buff);
						this.setAvatarAsync(new MongoDB.Binary(buff));
					});
				}
			});
		}

		setFriendsAsync(friends : string[]) {
			var key = {id : this.id};
			var data = {$set: {id : this.id, friends: friends}};
			DB.users.updateOne(key, data, {upsert: true});
		}
		
		addFriendAsync(friend : string) {
			DB.users.findOne({id : this.id}, (err, user) => {
				if (!err && user && user.friends) {
					DB.users.updateOne({id : this.id}, {$addToSet: {friends: friend}});
				}
			});
		}

		getFriends(callback : (err : Error, friends : User[]) => void) {
			function buildUserListAndFinish(ids : string[]) {
				var friends : User[] = [];
				for (var i = 0; i < ids.length; ++i)
					friends.push(new User(ids[i]));
				callback(null, friends);
			}
			DB.users.findOne({id : this.id}, (err, user) => {
				if (err) { callback(err, null); return; }
				if (user && user.friends) {
					buildUserListAndFinish(user.friends);
				} else {
					this.getToken((err, token) => {
						if (err) { callback(err, null); return; }
						Facebook.fetchFriends(token, (err, ids, names) => {
							if (err) { callback(err, null); return; }
							buildUserListAndFinish(ids);
							this.setFriendsAsync(ids);
							for (var i = 0; i < ids.length; ++i) {
								var friend = new User(ids[i]);
								friend.setNameAsync(names[i]);
								friend.addFriendAsync(this.id);
							}
						});
					});
				}
			});
		}

		setNameAsync(name : string) {
			var key = {id : this.id};
			var data = {$set: {id : this.id, name: name}};
			DB.users.updateOne(key, data, {upsert: true});
		}

		getName(token : string, callback : (err : Error, name : string) => void) {
			if (token == null) {
				this.getToken((err, token) => {
					if (err) { callback(err, null); return; }
					this.getName(token, callback);
				});
				return;
			}
			DB.users.findOne({id : this.id}, (err, user) => {
				if (err) { callback(err, null); return; }
				if (user && user.name) {
					callback(null, user.name);
				} else {
					Facebook.fetchUser(token, this.id, (err, userInfo) => {
						if (err) { callback(err, null); return; }
						callback(null, userInfo.name);
						this.setNameAsync(userInfo.name);
					});
				}
			});
		}
	}
	
	export module Challenge {
		export type CreationInfo = {
			owner : string,
			title: string,
			description : string,
			reward : string,
			targets : string[],
			duration : number,
			image? : Duvido.Upload
		};
	}
	
	export class Challenge {
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
	
	export class Upload {
		id : string;

		constructor(id : string) {
			this.id = id;
		}
		
		static create(owner : User, data : Buffer, callback : (err : Error, upload : Upload) => void) {
			var uploadData : DB.Upload = {
				id: UUID.v4().replace(/-/g, ""),
				time: new Date,
				owner: owner.id,
				data: new MongoDB.Binary(data)
			}
			DB.uploads.insertOne(uploadData, (err) => {
				if (err) { callback(err, null); return; }
				callback(null, new Upload(uploadData.id));
			});
		}
		
		checkExists(callback : (err : Error, exists : boolean) => void) {
			DB.uploads.findOne({id : this.id}, {_id: 1}, (err, upload) => {
				if (err) { callback(err, null); return; }
				if (upload) {
					callback(null, true);
				} else {
					callback(null, false);
				}
			});
		}
		
		getOwner(callback : (err : Error, owner : User) => void) {
			DB.uploads.findOne({id : this.id}, {_id: 0, owner: 1}, (err, upload) => {
				if (err) { callback(err, null); return; }
				if (upload) {
					callback(null, new User(upload.owner));
				} else {
					callback(null, null);
				}
			});
		}
		
		getData(callback : (err : Error, owner : User, data : MongoDB.Binary) => void) {
			DB.uploads.findOne({id : this.id}, {_id: 0, owner: 1, data: 1}, (err, upload) => {
				if (err) { callback(err, null, null); return; }
				if (upload) {
					callback(null, new User(upload.owner), upload.data);
				} else {
					callback(null, null, null);
				}
			});
		}
	}
}
