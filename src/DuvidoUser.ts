/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node.d.ts" />

export = User;

import DB = require("./DB");
import Facebook = require("./Facebook");
import MongoDB = require("mongodb");

class User {
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
