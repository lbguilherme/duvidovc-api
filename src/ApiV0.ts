export = ApiV0;

import Http = require("http");
import Graph = require("fbgraph");
import ApiBase = require("./ApiBase");
import DB = require("./DB");
import Facebook = require("./Facebook");

class ApiV0 extends ApiBase {

	// Checks for GraphAPI errors. If an error has been handled, returns true
	handleGraphError(resp : Http.ServerResponse, error : Graph.Error) : boolean {
		if (!error) return false;

		if (error.type == "OAuthException")
			this.fail(resp, 401, error.message);
		else
			this.fail(resp, 400, error.message);

		return true;
	}

	_notify_login(params : any, resp : Http.ServerResponse) {
		var token : string = params.token;
		var api = this;
		tryFind();

		function tryFind() {
			DB.User.findByToken(token, function(err : Error, user : DB.User) {
				if (err) fail(err);
				else if (user) sendReply(user.userId);
				else getTokenDetails();
			});
		}

		function getTokenDetails() {
			Graph.get("me", {access_token: token}, function(err : Graph.Error, user : Graph.User) {
				if (api.handleGraphError(resp, err)) return;

				addToDatabase(user.id);
			});
		}

		function addToDatabase(userId : string) {
			var user = DB.User.get(userId);
			user.addToken(token, function(err : Error) {
				if (err) fail(err);
				else sendReply(userId);
			});
		}

		function fail(err : Error) {
			resp.write("Error: " + err.message);
			resp.end();
		}

		function sendReply(userId : string) {
			resp.write("Your id is '" + userId+ "'.");
			resp.end();
		}
	}

	_avatar(params : any, resp : Http.ServerResponse) {
		new Facebook().sendAvatar(params.id, resp);
	}

}
