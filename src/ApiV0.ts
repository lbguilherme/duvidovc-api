export = ApiV0;

import Http = require("http");
import ApiBase = require("./ApiBase");
import Duvido = require("./Duvido");

class ApiV0 extends ApiBase {

	_login(params : any, resp : Http.ServerResponse) {
		var token = params.token;
		if (!token) {
			this.fail("token must be provided", resp);
			return;
		}
		
		Duvido.User.fromToken(token, (err, user) => {
			if (err) {
				this.fail(err.message, resp);
			} else {
				user.getName(token, (err, name) => {
					resp.write(JSON.stringify({id: user.id, name: name}));
					resp.end();
				});
			}
		});
	}

	_avatar(params : any, resp : Http.ServerResponse) {
		var user = new Duvido.User(params.id);
		user.getAvatar((err, buf) => {
			if (err) {
				this.fail(err.message, resp);
			} else {
				resp.setHeader("Content-Type", "image/png");
				resp.write(buf);
				resp.end();
			}
		});
	}

	_friends(params : any, resp : Http.ServerResponse) {
		var user = new Duvido.User(params.id);
		user.getToken((err, token) => {
			if (err) {
				this.fail(err.message, resp);
				return;
			}
			user.getFriends((err, friends) => {
				if (err) {
					this.fail(err.message, resp);
				} else {
					var friendsList : {id : string, name : string}[] = [];
					var count = 0;
					for (var i = 0; i < friends.length; ++i) {(() => {
						var obj = {id: friends[i].id, name: "?"}
						friendsList.push(obj);
						friends[i].getName(token, (err, name) => {
							if (!err)
								obj.name = name;
							else
								console.log(err);
							count += 1;
							if (count == friends.length) {
								resp.write(JSON.stringify(friendsList));
								resp.end();
							}
						});
					})()}
				}
			});
		});
	}
}
