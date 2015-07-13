export = Facebook;

import Https = require("https");
import await = require("asyncawait/await");
import Bluebird = require("bluebird");

module Facebook {
	var url = "https://graph.facebook.com/v2.4";
	
	export interface FacebookError {
		error : {
			type : string
			message : string
		}
	};
	
	export interface User extends FacebookError {
		id : string
		name : string
		first_name : string
		last_name : string
		gender : string
		birthday : string
	};
	
	export interface TokenInfo extends FacebookError {
		access_token : string
		token_type : string
		expires_in : number
		auth_type : string
	};
	
	export interface AvatarInfo extends FacebookError {
		data : {
			url : string
		}
	};
	
	interface Page<T> extends FacebookError {
		data : T[]
		paging : {
			next : string
		} 
	}

	export function getAvatar(id : string) {
		var info = fetchJson<AvatarInfo>(url+"/"+id+"/picture?type=square&width=320&height=320&redirect=0");
		
		if (info.error) {
			if (info.error.type == "OAuthException")
				info.error.type = "InvalidIdentifier"; // Won't cause logout
				
			throw new Error(info.error.type + ": " + info.error.message);
		}
		else {
			return fetchBinary(info.data.url);
		}
	}

	export function getMe(token : string) {
		return getUser(token, "me");
	}

	export function getUser(token : string, id : string) {
		var user = fetchJson<User>(url+"/"+id+"/?fields=id,name,first_name,last_name,birthday,gender&access_token="+token);
		
		if (user.error)
			throw new Error(user.error.type + ": " + user.error.message);
		else
			return user;
	}
	
	export function getFriends(token : string) {
		var result : {id : string, name : string}[] = [];
		var page = fetchJson<Page<User>>(url+"/me/friends/?access_token="+token);
		
		while (true) {
			for (var i = 0; i < page.data.length; ++i) {
				result.push({id: page.data[i].id, name: page.data[i].name});
			}
			
			if (page.paging && page.paging.next)
				page = fetchJson<Page<User>>(page.paging.next);
			else
				return result;
		}
	}
	
	export function getTokenInfo(token : string) {
		var tokenInfo = fetchJson<TokenInfo>(url+"/oauth/access_token_info?client_id=1497042670584041&access_token="+token);
		
		if (tokenInfo.error)
			throw new Error(tokenInfo.error.type + ": " + tokenInfo.error.message);
		else
			return tokenInfo;
	}
	
	function fetchJson<T>(url : string) {
		return await(new Bluebird.Promise<T>((resolve) => {
			Https.get(url, (res) => {
				var data = "";
				res.on("data", (chunk : string) => {
					data += chunk;
				});
				res.on("end", () => {
					resolve(<T>JSON.parse(data));
				});
			});
		}));
	}
	
	function fetchBinary(url : string) {
		return await(new Bluebird.Promise<Buffer>((resolve) => {
			Https.get(url, (res) => {
				var data : Buffer[] = [];
				res.on("data", (chunk : Buffer) => {
					data.push(chunk);
				});
				res.on("end", () => {
					resolve(Buffer.concat(data));
				});
			});
		}));
	}
}
