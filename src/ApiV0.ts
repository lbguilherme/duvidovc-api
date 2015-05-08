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
		
		Duvido.User.fromToken(token, function(err : Error, user : Duvido.User) {
			if (err) {
				this.fail(err.message, resp);
			} else {
				resp.write(JSON.stringify({id: user.id}));
				resp.end();
			}
		});
	}

	_avatar(params : any, resp : Http.ServerResponse) {
		var user = new Duvido.User(params.id);
		user.getAvatar(function(err : Error, buf : Buffer) {
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
		user.getToken(function(err : Error, token: string) {
			if (err) {
				this.fail(err.message, resp);
				return;
			}
			user.getFriends(function(err : Error, friends: Duvido.User[]) {
				if (err) {
					this.fail(err.message, resp);
				} else {
					var friendsList : {id : string, name : string}[] = [];
					var count = 0;
					for (var i = 0; i < friends.length; ++i) {(function(){
						var obj = {id: friends[i].id, name: "?"}
						friendsList.push(obj);
						friends[i].getName(token, function(err : Error, name : string) {
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
