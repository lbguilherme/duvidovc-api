/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node.d.ts" />

export = User;

import DB = require("./DB");
import Facebook = require("./Facebook");
import MongoDB = require("mongodb");
import async = require("asyncawait/async");

class User {
	id : string;

	constructor(id : string) {
		this.id = id;
	}
	
	setFirstLoginIfNeeded() {
		var user = DB.users.findOne({id: this.id});
		if (!user) return;
		if (user && user.firstLogin) return;
		DB.users.updateOneAsync({id: this.id}, {$set: {firstLogin: Date.now()}});
	}

	addToken(token : string) {
		var key = {token : token};
		var tokenInfo = Facebook.getTokenInfo(token);
		DB.tokens.updateOne(key, {$set: {
			token : token,
			userId : this.id,
			expireTime : Date.now() + tokenInfo.expires_in
		}});
		this.setFirstLoginIfNeeded();
	}

	static fromToken(token : string) {
		var tokenInfo = DB.tokens.findOne({token: token});
		if (tokenInfo) {
			return new User(tokenInfo.userId);
		} else {
			var me = Facebook.getMe(token);
			var user = new User(me.id);
			user.addToken(token);
			user.setNameAsync(me.name);
			return user;
		}
	}
	
	exists() {
		var user = DB.users.findOne({id: this.id}, {_id: 1});
		return !!user;
	}

	getToken() {
		var tokenInfo = DB.tokens.findOne({userId: this.id});
		if (tokenInfo) {
			return tokenInfo.token;
		} else {
			throw new Error("no token available for this user");
		}
	}
	
	setLastLoginAsync() {
		var user = DB.users.findOne({id: this.id});
		if (!user) return;
		DB.users.updateOne({id: this.id}, {$set: {lastLogin: Date.now()}});
	}

	getAvatar() {
		var user = DB.users.findOne({id: this.id}, {_id: 0, avatar: 1});
		if (user && user.avatar) {
			var data : MongoDB.Binary = user.avatar;
			var buff = data.read(0, data.length());
			return buff;
		} else {
			var avatar = Facebook.getAvatar(this.id);
			if (user)
				DB.users.updateOneAsync({id: this.id}, {$set: {avatar: new MongoDB.Binary(avatar)}});
			return avatar;
		}
	}

	setFriendsAsync(friends : string[]) {
		DB.users.updateOneAsync({id: this.id}, {$set: {id: this.id, friends: friends}});
	}
	
	addFriend(friend : string) {
		var user = DB.users.findOne({id : this.id}, {_id: 0, friends: 1});
		if (user && user.friends) {
			DB.users.updateOne({id : this.id}, {$addToSet: {friends: friend}});
		}
	}

	getFriends(token : string) {
		var user = DB.users.findOne({id : this.id});
		
		if (user && user.friends) {
			return user.friends.map(id => {return new User(id);});
		} else {
			var friends = Facebook.getFriends(token);
			var ids = friends.map(f => {return f.id;});
			this.setFriendsAsync(ids);
			for (var i = 0; i < friends.length; ++i) {
				async(() => {
						var friend = new User(friends[i].id);
						friend.setNameAsync(friends[i].name);
						friend.addFriend(this.id);
				})();
			}
			return ids.map(id => {return new User(id);});
		}
	}

	setNameAsync(name : string) {
		DB.users.updateOneAsync({id: this.id}, {$set: {id: this.id, name: name}});
	}

	getName(token : string) : string {
		var user = DB.users.findOne({id : this.id}, {_id: 0, name: 1});
		if (user && user.name) {
			return user.name;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setNameAsync(userInfo.name);
			return userInfo.name;
		}
	}
}
