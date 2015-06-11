export = ApiV0;

import Http = require("http");
import ApiBase = require("./ApiBase");
import Duvido = require("./Duvido");
import Tracker = require("./Tracker");
import Utility = require("./Utility");

class ApiV0 extends ApiBase {

	/**
	 * api/v0/login
	 * - token: Facebook access token from the user
	 * 
	 * Returns: JSON
	 * {
	 * 	id : string, the current user's id
	 *  name : string, the current user's name
	 * }
	 */
	_login(tracker : Tracker, params : any, resp : Http.ServerResponse) {
		if (!params.token) {
			this.fail(tracker, "token must be provided", resp);
			return;
		}
		
		Duvido.User.fromToken(params.token, (err, user) => {
			if (err) {
				this.fail(tracker, err.message, resp);
			} else {
				tracker.setUserId(user.id);
				user.setLastLoginAsync();
				user.getName(params.token, (err, name) => {
					resp.setHeader("Content-Type", "application/json");
					resp.write(JSON.stringify({id: user.id, name: name}));
					resp.end();
					tracker.setName(name);
					tracker.end();
				});
			}
		});
	}

	/**
	 * api/v0/avatar
	 * - id: The id of any user
	 * 
	 * Returns: BINARY
	 * JPG encoded avatar image.
	 */
	_avatar(tracker : Tracker, params : any, resp : Http.ServerResponse) {
		var user = new Duvido.User(params.id);
		tracker.setUserId(user.id);
		user.getAvatar((err, buf) => {
			if (err) {
				this.fail(tracker, err.message, resp);
			} else {
				resp.setHeader("Content-Type", "image/png");
				resp.write(buf);
				resp.end();
				user.getName(null, (err, name) => {
					tracker.setName(name);
					tracker.end();
				});
			}
		});
	}

	/**
	 * api/v0/friends
	 * - id: The id of any user
	 * 
	 * Returns: JSON
	 * An array of the following:
	 * {
	 * 	id : string, the id of the friend
	 *  name : string, his name
	 * }
	 */
	_friends(tracker : Tracker, params : any, resp : Http.ServerResponse) {
		var user = new Duvido.User(params.id);
		tracker.setUserId(user.id);
		user.getToken((err, token) => {
			if (err) {
				this.fail(tracker, err.message, resp);
				return;
			}
			user.getFriends((err, friends) => {
				if (err) {
					this.fail(tracker, err.message, resp);
					return;
				}
				var friendsList : {id : string, name : string}[] = [];
				Utility.doForAll(friends.length, (i, done) => {
					var obj = {id: friends[i].id, name: "?"}
					friendsList.push(obj);
					friends[i].getName(token, (err, name) => {
						if (!err)
							obj.name = name;
						else
							console.log(err);
						done();
					});
				}, () => {
					resp.setHeader("Content-Type", "application/json");
					resp.write(JSON.stringify(friendsList));
					resp.end();
					user.getName(token, (err, name) => {
						tracker.setName(name);
						tracker.end();
					});
				});
			});
		});
	}
}
