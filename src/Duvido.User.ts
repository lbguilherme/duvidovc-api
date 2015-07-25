/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node.d.ts" />

export = User;

import DB = require("./DB");
import Facebook = require("./Facebook");
import Data = require("./Duvido.Data");
import MongoDB = require("mongodb");
import async = require("asyncawait/async");
import InvalidTokenError = require("./InvalidTokenError");

class User {
	id : string;

	constructor(id : string) {
		this.id = id;
	}

	static fromToken(token : string) {
		var requiredScopes = ["email", "user_birthday", "user_friends", "public_profile"];
		var tokenInfo = DB.tokens.findOne({token: token});
		
		if (tokenInfo) {
			if (!tokenInfo.permissions)
				tokenInfo.permissions = [];
			
			var acceptableScopes = true;
			requiredScopes.forEach(scope => {
				if (tokenInfo.permissions.indexOf(scope) == -1)
					acceptableScopes = false;
			});
			
			if (tokenInfo.expiresAt >= new Date() && acceptableScopes) {
				return new User(tokenInfo.userId);
			}
		}
		
		var fbTokenInfo = Facebook.getTokenInfo(token);
		
		if (fbTokenInfo.app_id != "1497042670584041" || fbTokenInfo.is_valid == false) {
			throw new InvalidTokenError();
		}
		
		requiredScopes.forEach(scope => {
			if (fbTokenInfo.scopes.indexOf(scope) == -1)
				throw new InvalidTokenError();
		});
		
		DB.tokens.insertOne({
			token: token,
			userId: fbTokenInfo.user_id,
			expiresAt: new Date(fbTokenInfo.expires_at*1000),
			permissions: fbTokenInfo.scopes
		});
		
		return new User(fbTokenInfo.user_id);
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

	getAvatar() {
		var user = DB.users.findOne({id: this.id}, {_id: 0, avatarDataId: 1});
		if (user && user.avatarDataId) {
			var entry = DB.data.findOne({id: user.avatarDataId}, {_id: 0, data: 1});
			if (entry)
				return entry.data.read(0, entry.data.length());
		}
		
		var avatar = Facebook.getAvatar(this.id);
		if (user) {
			var data = Data.create(avatar);
			data.incrementLinks();
			DB.users.updateOneAsync({id: this.id}, {$set: {
				avatarDataId: data.id
			}});
		}
		
		return avatar;
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
			friends.forEach(friendInfo => {
				async(() => {
					var friend = new User(friendInfo.id);
					friend.setNameAsync(friendInfo.name);
					friend.addFriend(this.id);
				})();
			});
			return ids.map(id => {return new User(id);});
		}
	}

	setNameAsync(name : string) {
		DB.users.updateOneAsync({id: this.id}, {$set: {id: this.id, name: name}});
	}
	
	setFromFacebookUser(userInfo : Facebook.User) {
		DB.users.updateOne({id: this.id}, {$set: {
			id: this.id,
			name: userInfo.name,
			firstName: userInfo.first_name,
			lastName: userInfo.last_name,
			gender: userInfo.gender,
			birthday: userInfo.birthday,
			email: userInfo.email
		}});
	}
	
	getName(token : string) {
		var user = DB.users.findOne({id : this.id}, {_id: 0, name: 1});
		if (user && user.name) {
			return user.name;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return userInfo.name;
		}
	}

	getFirstLastName(token : string) {
		var user = DB.users.findOne({id : this.id}, {_id: 0, firstName: 1, lastName: 1});
		if (user && user.firstName && user.lastName) {
			return [user.firstName, user.lastName];
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return [userInfo.first_name, userInfo.last_name];
		}
	}
	
	getBirthday(token : string) {
		var user = DB.users.findOne({id : this.id}, {_id: 0, birthday: 1});
		if (user && user.birthday) {
			return new Date(user.birthday);
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return new Date(userInfo.birthday);
		}
	}
	
	getGender(token : string) {
		var user = DB.users.findOne({id : this.id}, {_id: 0, gender: 1});
		if (user && user.gender) {
			return user.gender;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return userInfo.gender;
		}
	}
	
	getEmail(token : string) {
		var user = DB.users.findOne({id : this.id}, {_id: 0, email: 1});
		if (user && user.email) {
			return user.email;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return userInfo.email;
		}
	}
}
