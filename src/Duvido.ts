export = Duvido;

import DB = require("./DB");
import Facebook = require("./Facebook");
import MongoDB = require("mongodb");

module Duvido {
	export class User {
		id : string;

		constructor(id : string) {
			this.id = id;
		}

		addTokenAsync(token : string) {
			var key = {id : this.id};
			var data = {$addToSet: { tokens: token }, $set: {userId : this.id}};
			DB.users.updateOne(key, data, {upsert: true});
		}

		static fromToken(token : string, callback : (err : Error, user : User) => void) {
			DB.users.findOne({tokens : token}, function(err, user) {
				if (user === null) {
					Facebook.fetchMe(token, function(err, userInfo) {
						if (err) { callback(err, null); return; }
						var user = new User(userInfo.id);
						callback(null, user);
						user.addTokenAsync(token);
						user.setNameAsync(userInfo.name);
					});
				} else {
					callback(null, new User(user.userId));
				}
			});
		}

		getToken(callback : (err : Error, token : string) => void) {
			var id = this.id;
			DB.users.findOne({userId : id}, function(err, user) {
				if (err) { callback(err, null); return; }
				if (user && user.tokens) {
					callback(null, user.tokens[user.tokens.length - 1]);
				} else {
					callback(new Error("no token available for this user"), null);
				}
			});
		}

		setAvatarAsync(avatar : MongoDB.Binary) {
			var key = {userId : this.id};
			var data = {$set: {userId : this.id, avatar: avatar}};
			DB.users.findOne(key, function(err, user) {
				if (user)
					DB.users.updateOne(key, data, {upsert: true});
			});
		}

		getAvatar(callback : (err : Error, buf : Buffer) => void) {
			var _this = this;
			DB.users.findOne({userId : this.id}, function(err, user) {
				if (err) { callback(err, null); return; }
				if (user && user.avatar) {
					var data : MongoDB.Binary = user.avatar;
					var buff = data.read(0, data.length());
					callback(null, buff);
				} else {
					Facebook.fetchAvatar(_this.id, function(err, buff) {
						if (err) { callback(err, null); return; }
						callback(null, buff);
						_this.setAvatarAsync(new MongoDB.Binary(buff));
					});
				}
			});
		}

		setFriendsAsync(friends : string[]) {
			var key = {userId : this.id};
			var data = {$set: {userId : this.id, friends: friends}};
			DB.users.updateOne(key, data, {upsert: true});
		}

		getFriends(callback : (err : Error, friends : User[]) => void) {
			var _this = this;
			function buildUserListAndFinish(ids : string[]) {
				var friends : User[] = [];
				for (var i = 0; i < ids.length; ++i)
					friends.push(new User(ids[i]));
				callback(null, friends);
			}
			DB.users.findOne({userId : this.id}, function(err, user) {
				if (err) { callback(err, null); return; }
				if (user && user.friends) {
					buildUserListAndFinish(user.friends);
				} else if (user && user.tokens) {
					var token = user.tokens[user.tokens.length - 1];
					Facebook.fetchFriends(token, function(err, ids, names) {
						if (err) { callback(err, null); return; }
						buildUserListAndFinish(ids);
						_this.setFriendsAsync(ids);
						for (var i = 0; i < ids.length; ++i)
							new User(ids[i]).setNameAsync(names[i]);
					});
				} else {
					callback(new Error("no token available to get friends"), null);
				}
			});
		}

		setNameAsync(name : string) {
			var key = {userId : this.id};
			var data = {$set: {userId : this.id, name: name}};
			DB.users.updateOne(key, data, {upsert: true});
		}

		getName(token : string, callback : (err : Error, name : string) => void) {
			var _this = this;
			DB.users.findOne({userId : this.id}, function(err, user) {
				if (err) { callback(err, null); return; }
				if (user && user.name) {
					callback(null, user.name);
				} else {
					Facebook.fetchUser(token, _this.id, function(err, userInfo) {
						if (err) { callback(err, null); return; }
						callback(null, userInfo.name);
						_this.setNameAsync(userInfo.name);
					});
				}
			});
		}
	}
}
