export = ApiV0;

import Http = require("http");
import Graph = require("fbgraph");
import ApiBase = require("./ApiBase");

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

		Graph.get("me", {access_token: token}, function(err : Graph.Error, user : Graph.User) {
			if (this.handleGraphError(resp, err)) return;

			resp.write("Your id is '" + user.id + "'.");
			resp.end();
		}.bind(this));
	}

}
