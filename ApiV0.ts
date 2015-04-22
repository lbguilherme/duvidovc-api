export = ApiV0;

import Http = require("http");
import Graph = require("fbgraph");
import ApiBase = require("./ApiBase");

class ApiV0 extends ApiBase {

	_notify_login(params : any, resp : Http.ServerResponse) {
		var token : string = params.token;

		if (typeof token != "string")
			return this.fail(resp, "invalid token");

		Graph.get("me", {access_token: token}, (err : Graph.Error, user : Graph.User) => {
			if (err !== null)
				return this.fail(resp, err.message);

			resp.write("Your id is '" + user.id + "'.");
			resp.end();
		});
	}

}
