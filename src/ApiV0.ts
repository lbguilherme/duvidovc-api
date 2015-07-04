export = ApiV0;

import ApiBase = require("./ApiBase");
import Duvido = require("./Duvido");
import Tracker = require("./Tracker");
import Utility = require("./Utility");
import Http = require("http");
import await = require("asyncawait/await");
import async = require("asyncawait/async");

class ApiV0 extends ApiBase {

	/**
	 * POST /v0/login
	 * - token: Facebook access token from the user
	 * 
	 * Returns: JSON
	 * {
	 * 	id : string, the current user's id
	 *  name : string, the current user's name
	 * }
	 */
	post_login(tracker : Tracker, params : {token : string}, resp : Http.ServerResponse) {
		Utility.typeCheck(params, {token: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var name = user.getName(params.token);
		user.setLastLoginAsync();
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify({id: user.id, name: name}));
		resp.end();
		
		tracker.setUserId(user.id);
		tracker.setName(name);
		tracker.end();
	}

	/**
	 * GET /v0/avatar
	 * - id: The id of any user
	 * 
	 * Returns: BINARY
	 * JPG encoded avatar image.
	 */
	get_avatar(tracker : Tracker, params : {id : string}, resp : Http.ServerResponse) {
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
	get_avatars(tracker : Tracker, params : {id : string}, resp : Http.ServerResponse) {
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
	get_friends(tracker : Tracker, params : {token : string}, resp : Http.ServerResponse) {
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
		
		tracker.setUserId(user.id);
		tracker.setName(user.getName(params.token));
		tracker.end();
	}
	
	/**
	 * POST /v0/upload
	 * - token: The owner token
	 * post data: The binary data you want to store
	 * 
	 * Returns: Plaintext: the upload id
	 */
	post_upload(tracker : Tracker, params : {token : string, body : string}, resp : Http.ServerResponse) {
		Utility.typeCheck(params, {token: "string", body: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var upload = Duvido.Upload.create(user, new Buffer(params.body, "binary"));
		
		resp.setHeader("Content-Type", "text/plain");
		resp.write(upload.id);
		resp.end();
		
		tracker.setUserId(user.id);
		tracker.setName(user.getName(params.token));
		tracker.end();
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
	post_challenge(tracker : Tracker, params : {token : string, title : string, description : string, reward : string,
		                                        targets : string, duration : string, image : string}, resp : Http.ServerResponse) {
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
		
		tracker.setUserId(user.id);
		tracker.setName(user.getName(params.token));
		tracker.end();
	}
	
	/**
	 * GET /v0/challenges
	 * - token: user token
	 * 
	 * Returns: The "info" variable
	 */
	get_challenges(tracker : Tracker, params : {token : string}, resp : Http.ServerResponse) {
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
					sentTime : Date
					judgedTime : Date
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
					submissions: target.submissions
				};})
			});
		});
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify(infos));
		resp.end();
		
		tracker.setUserId(user.id);
		tracker.setName(user.getName(params.token));
		tracker.end();
	}
}
