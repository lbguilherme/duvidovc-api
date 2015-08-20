export = Facebook;

import Https = require("https");
import await = require("asyncawait/await");
import Bluebird = require("bluebird");
import InvalidTokenError = require("./InvalidTokenError");

module Facebook {
	var url = "https://graph.facebook.com/v2.4";
	var appToken = "1497042670584041|D-l3_OdX-j6DqTVO4HGuajQubrk";
	
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
		email : string
	};
	
	export interface TokenInfo extends FacebookError {
		app_id : string
		expires_at : number
		is_valid : boolean
		scopes : string[]
		user_id : string
	};
	
	export interface AvatarInfo extends FacebookError {
		data : {
			url : string
		}
	};
	
	interface DataWrap<T> {
		data : T
	}
	
	interface Page<T> extends FacebookError {
		data : T[]
		paging : {
			next : string
		} 
	}

	export function getAvatar(id : string) {
		try {
			var info = fetchJson<AvatarInfo>(url+"/"+id+"/picture?type=square&width=320&height=320&redirect=0");
		} catch (e) {
			if (e instanceof InvalidTokenError)
				throw new Error(e.message);
			else
				throw e;
		}
		
		return fetchBinary(info.data.url);
	}

	export function getMe(token : string) {
		return getUser(token, "me");
	}

	export function getUser(token : string, id : string) {
		return fetchJson<User>(url+"/"+id+"/?fields=id,name,first_name,last_name,birthday,gender,email&access_token="+token);
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
		var tokenInfo = fetchPlainJson<DataWrap<TokenInfo>>(url+"/debug_token?input_token="+token+"&access_token="+appToken).data;
		
		if (tokenInfo.error)
			throw new InvalidTokenError(tokenInfo.error.message);
		else
			return tokenInfo;
	}
	
	function fetchPlainJson<T>(url : string) {
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
	
	function fetchJson<T extends FacebookError>(url : string) {
		var data = fetchPlainJson<T>(url);
		if (data.error) {
			if (data.error.type == "OAuthException")
				throw new InvalidTokenError(data.error.message);
			else
				throw new Error(data.error.type + ": " + data.error.message);
		}
		return data;
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
