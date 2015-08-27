/// <reference path="../decl/mongodb.d.ts" />
/// <reference path="../decl/node.d.ts" />

export = User;

import DB = require("./DB");
import Facebook = require("./Facebook");
import Data = require("./Duvido.Data");
import async = require("asyncawait/async");
import InvalidTokenError = require("./InvalidTokenError");

class User {
	id : string;

	constructor(id : string) {
		this.id = id;
	}

	static fromToken(token : string) {
		var requiredScopes = ["email", "user_birthday", "user_friends", "public_profile"];
		var tokenInfo = DB.TokensTable.fetch(token);
		
		if (tokenInfo) {
			var scopes = tokenInfo.scopes || [];
			
			var acceptableScopes = true;
			requiredScopes.forEach(scope => {
				if (scopes.indexOf(scope) == -1)
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
		
		DB.TokensTable.insert({
			accessToken: token,
			userId: fbTokenInfo.user_id,
			expiresAt: new Date(fbTokenInfo.expires_at*1000),
			scopes: fbTokenInfo.scopes
		});
		
		return new User(fbTokenInfo.user_id);
	}
	
	exists() {
		return DB.UsersTable.exists(this.id);
	}

	getAvatar() {
		var user = DB.UsersTable.fetch(this.id);
		if (user && user.avatarDataId) {
			var data = new Data(user.avatarDataId);
			if (data.exists())
				return data.getBuffer();
		}
		
		var avatar = Facebook.getAvatar(this.id);
		if (user) {
			DB.UsersTable.set(this.id, "avatarDataId", Data.create(avatar).id);
		}
		
		return avatar;
	}
	
	setFriendsAsync(friends : string[]) {
		DB.UsersTable.set(this.id, "friends", friends);
	}
	
	addFriend(friend : string) {
		var user = DB.UsersTable.fetch(this.id);
		if (user && user.friends) {
			DB.UsersTable.addToSet(this.id, "friends", friend);
		}
	}

	getFriends(token : string) {
		var user = DB.UsersTable.fetch(this.id);
		
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
		DB.UsersTable.set(this.id, "name", name);
	}
	
	setFromFacebookUser(userInfo : Facebook.User) {
		DB.UsersTable.set(this.id, "name", userInfo.name);
		DB.UsersTable.set(this.id, "firstName", userInfo.first_name);
		DB.UsersTable.set(this.id, "lastName", userInfo.last_name);
		DB.UsersTable.set(this.id, "gender", userInfo.gender);
		DB.UsersTable.set(this.id, "birthday", new Date(userInfo.birthday));
		DB.UsersTable.set(this.id, "email", userInfo.email);
	}
	
	getName(token : string) {
		var user = DB.UsersTable.fetch(this.id);
		if (user && user.name) {
			return user.name;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return userInfo.name;
		}
	}

	getFirstLastName(token : string) {
		var user = DB.UsersTable.fetch(this.id);
		if (user && user.firstName && user.lastName) {
			return [user.firstName, user.lastName];
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return [userInfo.first_name, userInfo.last_name];
		}
	}
	
	getBirthday(token : string) {
		var user = DB.UsersTable.fetch(this.id);
		if (user && user.birthday) {
			return user.birthday;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return new Date(userInfo.birthday);
		}
	}
	
	getAge(token : string) {
	    var today = new Date();
	    var birthday = this.getBirthday(token);
	    var age = today.getFullYear() - birthday.getFullYear();
	    var m = today.getMonth() - birthday.getMonth();
	    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
	        age--;
	    }
	    return age;
	}
	
	getGender(token : string) {
		var user = DB.UsersTable.fetch(this.id);
		if (user && user.gender) {
			return user.gender;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return userInfo.gender;
		}
	}
	
	getEmail(token : string) {
		var user = DB.UsersTable.fetch(this.id);
		if (user && user.email) {
			return user.email;
		} else {
			var userInfo = Facebook.getUser(token, this.id);
			this.setFromFacebookUser(userInfo);
			return userInfo.email;
		}
	}
	
	addGcmToken(gcmToken : string) {
		DB.UsersTable.addToSet(this.id, "gcmTokens", gcmToken);
	}
	
	getGcmTokens() : string[] {
		var user = DB.UsersTable.fetch(this.id);
		return user.gcmTokens || [];
	}
	
	registerAction(action : string, object : string, param : string, ip : string, token : string) {
		DB.ActionsTable.insert({
			user: this.id,
			action: action,
			object: object,
			token: token,
			param: param,
			time: new Date(),
			ip: ip
		});
	}
}
