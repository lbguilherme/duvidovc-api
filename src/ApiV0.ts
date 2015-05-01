export = ApiV0;

import Http = require("http");
import ApiBase = require("./ApiBase");
import Duvido = require("./Duvido");

class ApiV0 extends ApiBase {

	_notify_login(params : any, resp : Http.ServerResponse) {
		var token : string = params.token;

		Duvido.User.fromToken(token, function(err: Error, user: Duvido.User) {
			if (err) {
				resp.statusCode = 500;
				resp.write("Error: " + err.message);
				resp.end();
			} else {
				resp.write("Your id is '" + user.userId + "'.");
				resp.end();
			}
		});
	}

	_avatar(params : any, resp : Http.ServerResponse) {
		var id = params.id;
		Duvido.User.fromId(id).getAvatar(function(err: Error, buf: Buffer) {
			if (err) {
				resp.statusCode = 500;
				resp.write("Error: " + err.message);
				resp.end();
			} else {
				resp.setHeader("Content-Type", "image/png");
				resp.write(buf);
				resp.end();
			}
		});
	}

}
