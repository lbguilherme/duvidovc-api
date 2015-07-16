export = ApiV0;

import ApiBase = require("./ApiBase");
import Duvido = require("./Duvido");
import Utility = require("./Utility");
import Http = require("http");
import await = require("asyncawait/await");
import async = require("asyncawait/async");

class ApiV0 extends ApiBase {
	
	/**
	 * GET /v0/status
	 */
	get_status(resp : Http.ServerResponse, params : {}) {
		resp.write("ok");
		resp.end();
	}

	/**
	 * POST /v0/login
	 * - token: Facebook access token from the user
	 * 
	 * Returns: JSON
	 * {
	 * 	id : string, the current user's id
	 *  name : string, the current user's name
	 *  firstName : string, the current user's first name
	 *  lastName : string, the current user's last name
	 *  birthday : string, the current user's birthday
	 *  gender : string, the current user's gender
	 * }
	 */
	post_login(resp : Http.ServerResponse, params : {token : string}) {
		Utility.typeCheck(params, {token: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var name = user.getName(params.token);
		var firstLastNames = user.getFirstLastName(params.token);
		var birthday = user.getBirthday(params.token);
		var gender = user.getGender(params.token);
		var email = user.getEmail(params.token);
		user.setLastLoginAsync();
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify({
			id: user.id,
			name: name,
			firstName: firstLastNames[0],
			lastName: firstLastNames[1],
			birthday: birthday,
			gender: gender,
			email: email
		}));
		resp.end();
	}

	/**
	 * GET /v0/avatar
	 * - id: The id of any user
	 * 
	 * Returns: BINARY
	 * JPG encoded avatar image.
	 */
	get_avatar(resp : Http.ServerResponse, params : {id : string}) {
		Utility.typeCheck(params, {id: "string"}, "params");
		
		var user = new Duvido.User(params.id);
		resp.setHeader("Content-Type", "image/jpeg");
		resp.write(user.getAvatar());
		resp.end();
	}

	/**
	 * GET /v0/avatars
	 * - id: A list of comma-separated ids of any users
	 * 
	 * Returns: BINARY
	 * A sequence of the following for each input id:
	 *   - a 4-byte unsigned integer (big endian) to specify image size in bytes
	 *   - the avatar image data as JPG
	 */
	get_avatars(resp : Http.ServerResponse, params : {id : string}) {
		Utility.typeCheck(params, {id: "string"}, "params");
		
		var ids = params.id.split(",");
		if (ids.length > 100)
			throw new Error("too many avatars");
		
		var avatars = await(ids.map(id => {
			return async(() => {
				return new Duvido.User(id).getAvatar();
			})();
		}));
		
		resp.setHeader("Content-Type", "application/octet-stream");
		avatars.forEach(avatar => {
			var size = new Buffer(4);
			size.writeUInt32BE(avatar.length, 0);
			resp.write(size);
			resp.write(avatar);
		});
		resp.end();
	}

	/**
	 * GET /v0/friends
	 * - token: user token
	 * 
	 * Returns: JSON
	 * An array of the following:
	 * {
	 * 	id : string, the id of the friend
	 *  name : string, his name
	 * }
	 */
	get_friends(resp : Http.ServerResponse, params : {token : string}) {
		Utility.typeCheck(params, {token: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var friends = await(user.getFriends(params.token).map(user => {
			return async(() => {
				return {id: user.id, name: user.getName(params.token)};
			})();
		}));
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify(friends));
		resp.end();
	}
	
	/**
	 * POST /v0/upload
	 * - token: The owner token
	 * post data: The binary data you want to store
	 * 
	 * Returns: Plaintext: the upload id
	 */
	post_upload(resp : Http.ServerResponse, params : {token : string, body : string}) {
		Utility.typeCheck(params, {token: "string", body: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var upload = Duvido.Upload.create(user, new Buffer(params.body, "binary"));
		
		resp.setHeader("Content-Type", "text/plain");
		resp.write(upload.id);
		resp.end();
	}

	/**
	 * POST /v0/challenge
	 * - token: The owner token
	 * - title: The challenge title
	 * - description: The challenge text
	 * - reward: The reward text
	 * - targets: A comma separated list of friend's ids
	 * - duration: The duration in minutes
	 * - image: The upload id of the image, optional
	 * 
	 * Returns: Nothing
	 */
	post_challenge(resp : Http.ServerResponse, params : {token : string, title : string, description : string, reward : string,
		                                                 targets : string, duration : string, image : string}) {
		Utility.typeCheck(params, {
			token: "string", title: "string", description: "string", reward: "string", targets: "string", duration: "string", image: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var info : Duvido.Challenge.CreationInfo = {
			owner: user.id,
			title: params.title,
			description: params.description,
			reward: params.reward,
			targets: params.targets.split(","),
			duration: parseInt(params.duration),
			image: params.image ? new Duvido.Upload(params.image) : null
		}
		
		var challenge = Duvido.Challenge.create(info);
		
		resp.end();
	}
	
	/**
	 * GET /v0/challenges
	 * - token: user token
	 * 
	 * Returns: The "info" variable
	 */
	get_challenges(resp : Http.ServerResponse, params : {token : string}) {
		Utility.typeCheck(params, {token: "string"}, "params");
		
		var infos : {
			id : string
			title : string
			description : string
			reward : string
			duration : number
			image : string
			targets : {
				id : string
				name : string
				status : string // "sent" | "received" | "read" | "submitted" | "rewarded"
				submissions : {
					status : string // "waiting" | "accepted" | "rejected"
					text : string
					image : string
					sentTime : string
					judgedTime : string
				}[]
			}[]
		}[] = [];
		
		var user = Duvido.User.fromToken(params.token);
		var challenges = Duvido.Challenge.listFromOwner(user);
		
		// Collect all ids
		var ids : string[] = [];
		challenges.forEach(challenge => {
			challenge.data.targets.forEach(target => {
				var id = target.id;
				if (ids.indexOf(id) == -1)
					ids.push(id);
			});
		});
		
		// Fetch the name of each id
		var names : {[id : string] : string} = {};
		await(ids.map(id => {
			return async(() => {
				names[id] = new Duvido.User(id).getName(params.token);
			})();
		}));
		
		// Add all challenges to the final reply list
		challenges.forEach(challenge => {
			var c = challenge.data;
			infos.push({
				id: c.id,
				title: c.title,
				description: c.description,
				reward: c.reward,
				duration: c.duration,
				image: c.image,
				targets: c.targets.map(target => {return {
					id: target.id,
					name: names[target.id],
					status: target.status,
					submissions: target.submissions.map(submission => {return {
						status: submission.status,
						text: submission.text,
						image: submission.image,
						sentTime: submission.sentTime.getTime()+"",
						judgedTime: submission.judgedTime.getTime()+""
					};})
				};})
			});
		});
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify(infos));
		resp.end();
	}
	
	
	/**
	 * GET /v0/feed
	 * - token: user token
	 * 
	 * Returns: The "info" variable
	 */
	get_feed(resp : Http.ServerResponse, params : {token : string}) {
		Utility.typeCheck(params, {token: "string"}, "params");
		
		var infos : {
			id : string
			owner : string
			ownerName : string
			title : string
			description : string
			reward : string
			duration : number
			image : string
		}[] = [];
		
		var user = Duvido.User.fromToken(params.token);
		var challenges = Duvido.Challenge.listFromTarget(user);
		
		// Collect all ids
		var ids : string[] = [];
		challenges.forEach(challenge => {
			var id = challenge.data.owner;
			if (ids.indexOf(id) == -1)
				ids.push(id);
		});
		
		// Fetch the name of each id
		var names : {[id : string] : string} = {};
		await(ids.map(id => {
			return async(() => {
				names[id] = new Duvido.User(id).getName(params.token);
			})();
		}));
		
		// Add all challenges to the final reply list
		challenges.forEach(challenge => {
			var c = challenge.data;
			infos.push({
				id: c.id,
				owner: c.owner,
				ownerName: names[c.owner],
				title: c.title,
				description: c.description,
				reward: c.reward,
				duration: c.duration,
				image: c.image
			});
		});
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify(infos));
		resp.end();
	}
}
