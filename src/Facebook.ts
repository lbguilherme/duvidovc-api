export = Facebook;

import Https = require("https");

module Facebook {
	var url = "https://graph.facebook.com/v2.3";
	
	export type User = {
		id : string;
		name : string;
	};
	
	export type TokenInfo = {
		access_token : string;
		token_type : string;
		expires_in : number;
		auth_type : string;
	};

	export function fetchAvatar(id : string, callback : (err : Error, buff : Buffer) => void) {
		fetchJson(url+"/"+id+"/picture?type=square&width=320&height=320&redirect=0", (obj) => {
			if (obj.error) {
				if (obj.error.type == "OAuthException")
					obj.error.type = "InvalidIdentifier"; // Won't cause logout
				callback(new Error(obj.error.type + ": " + obj.error.message), null);
			}
			else {
				fetchBinary(obj.data.url, (buffer) => {
					callback(null, buffer);
				});
			}
		});
	}

	export function fetchMe(token : string, callback : (err : Error, userInfo : Facebook.User) => void) {
		fetchUser(token, "me", callback);
	}

	export function fetchUser(token : string, id : string, callback : (err : Error, userInfo : Facebook.User) => void) {
		fetchJson(url+"/"+id+"/?access_token="+token, (obj) => {
			if (obj.error)
				callback(new Error(obj.error.type + ": " + obj.error.message), null);
			else
				callback(null, obj);
		});
	}
	
	export function fetchFriends(token : string, callback : (err : Error, ids : string[], names : string[]) => void) {
		var ids : string[] = [];
		var names : string[] = [];

		function processPage(obj : any) {
			if (obj.error) {
				callback(new Error(obj.error.type + ": " + obj.error.message), null, null);
				return;
			}
			for (var i = 0; i < obj.data.length; ++i) {
				ids.push(obj.data[i].id);
				names.push(obj.data[i].name);
			}
			if (obj.paging && obj.paging.next)
				fetchJson(obj.paging.next, processPage);
			else
				callback(null, ids, names);
		}

		fetchJson(url+"/me/friends/?access_token="+token, processPage);
	}
	
	export function fetchTokenInfo(token : string, callback : (err : Error, info : TokenInfo) => void) {
		fetchJson(url+"/oauth/access_token_info?client_id=1497042670584041&access_token="+token, (obj) => {
			if (obj.error)
				callback(new Error(obj.error.type + ": " + obj.error.message), null);
			else
				callback(null, obj);
		});
	}
	
	function fetchJson(url : string, callback : (object : any) => void) {
		Https.get(url, (res) => {
			var data = "";
			res.on("data", (chunk : string) => {
				data += chunk;
			});
			res.on("end", () => {
				callback(JSON.parse(data));
			});
		});
	}
	
	function fetchBinary(url : string, callback : (buffer : Buffer) => void) {
		Https.get(url, (res) => {
			res.setEncoding("binary");
			var data = "";
			res.on("data", (chunk : string) => {
				data += chunk;
			});
			res.on("end", () => {
				callback(new Buffer(data, "binary"));
			});
		});
	}
}
