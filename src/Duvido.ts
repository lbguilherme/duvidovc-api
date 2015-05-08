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
		
		setCreationTimeIfNeededAsync() {
			DB.users.findOne({id : this.id}, (err, user) => {
				if (err || !user) return;
				if (user.creationTime) return;
				DB.users.updateOne({id : this.id}, {$set: {creationTime: Date.now()}});
			});
		}

		addTokenAsync(token : string) {
			var key = {token : token};
			var data = {$set: {token : token, userId : this.id}};
			DB.users.updateOne(key, data, {upsert: true});
			Facebook.fetchTokenInfo(token, (err, tokenInfo) => {
				var data = {$set: {token : token, expires : tokenInfo.expires_in}};
				DB.users.updateOne(key, data, {upsert: true});
			});
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

		setAvatarAsync(avatar : MongoDB.Binary) {
			var key = {id : this.id};
			var data = {$set: {id : this.id, avatar: avatar}};
			DB.users.findOne(key, (err, user) => {
				if (user)
					DB.users.updateOne(key, data, {upsert: true}, this.setCreationTimeIfNeededAsync.bind(this));
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
			DB.users.updateOne(key, data, {upsert: true}, this.setCreationTimeIfNeededAsync.bind(this));
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
							for (var i = 0; i < ids.length; ++i)
								new User(ids[i]).setNameAsync(names[i]);
						});
					});
				}
			});
		}

		setNameAsync(name : string) {
			var key = {id : this.id};
			var data = {$set: {id : this.id, name: name}};
			DB.users.updateOne(key, data, {upsert: true}, this.setCreationTimeIfNeededAsync.bind(this));
		}

		getName(token : string, callback : (err : Error, name : string) => void) {
			var _this = this;
			DB.users.findOne({id : this.id}, (err, user) => {
				if (err) { callback(err, null); return; }
				if (user && user.name) {
					callback(null, user.name);
				} else {
					Facebook.fetchUser(token, _this.id, (err, userInfo) => {
						if (err) { callback(err, null); return; }
						callback(null, userInfo.name);
						_this.setNameAsync(userInfo.name);
					});
				}
			});
		}
	}
}
