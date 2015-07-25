export = ApiV0;

import ApiBase = require("./ApiBase");
import Duvido = require("./Duvido");
import Utility = require("./Utility");
import Http = require("http");
import await = require("asyncawait/await");
import async = require("asyncawait/async");
import Tracker = require("./Tracker");

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
	 * }
	 */
	post_login(resp : Http.ServerResponse, params : {token : string, ip : string, api : string, phone? : string, android? : string,
		                                             device? : string, brand? : string, model? : string, method : string, version : string,
													 dpi : string, width : string, height : string}) {
		Utility.typeCheck(params, {token: "string", method: "string", version: "string", dpi: "string", width: "string", height: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var name = user.getName(params.token);
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify({id: user.id,	name: name}));
		resp.end();
		
		var firstLastNames = user.getFirstLastName(params.token);
		var birthday = user.getBirthday(params.token);
		var gender = user.getGender(params.token);
		var email = user.getEmail(params.token);
		
		if (params.phone && params.phone[0] !== "+")
			params.phone = "+" + params.phone;
		
		Tracker.track("Logged in", {
			distinct_id: user.id,
			ip: params.ip,
			"Name": name,
			"First Name": firstLastNames[0],
			"Last Name": firstLastNames[1],
			"Birthday": birthday.toISOString().substr(0, 10),
			"Gender": gender,
			"Email": email,
			"Api Version": params.api,
			"Access Token": params.token,
			"Android Version": params.android,
			"Device Brand": params.brand,
			"Device Model": params.model,
			"Device Device": params.device,
			"Phone": params.phone,
			"Login Method": params.method,
			"App Version": params.version,
			"Screen DPI": params.dpi,
			"Screen Width": params.width,
			"Screen Height": params.height
		});
		
		Tracker.people.set(user.id, {
			ip: params.ip,
			$username: user.id,
			$name: name,
			$first_name: firstLastNames[0],
			$last_name: firstLastNames[1],
			$email: email,
			"Birthday": birthday.toISOString().substr(0, 10),
			"Age": user.getAge(params.token),
			"Gender": gender,
			"Access Token": params.token,
			"Api Version": "v0",
			"Android Version": params.android,
			"Device Brand": params.brand,
			"Device Model": params.model,
			"Device Device": params.device,
			"$phone": params.phone,
			"Facebook App": /app/i.test(params.method) ? "Yes" : "No",
			"App Version": params.version,
			"Screen DPI": params.dpi,
			"Screen Width": params.width,
			"Screen Height": params.height
		});
		
		Tracker.people.set_once(user.id, {
			$created: new Date().toISOString()
		});
		
		Tracker.people.increment(user.id, "Login Count");
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
	 * POST /v0/image
	 * - token: The owner token
	 * post data: The binary data of the image
	 * 
	 * Returns: Plaintext: the image id
	 */
	post_image(resp : Http.ServerResponse, params : {token : string, body : Buffer, orientation : string, ip : string}) {
		Utility.typeCheck(params, {token: "string", orientation: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var image = Duvido.Image.create(user, parseInt(params.orientation), params.body);
		
		resp.setHeader("Content-Type", "text/plain");
		resp.write(image.id);
		resp.end();
		
		Tracker.track("Image uploaded", {
			distinct_id: user.id,
			ip: params.ip,
			"Image Id (SHA512)": image.id,
			"Size": params.body.length,
			"Access Token": params.token
		});
		
		Tracker.people.increment(user.id, "Images Sent");
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
		                                                 targets : string, duration : string, image : string, ip : string}) {
		Utility.typeCheck(params, {
			token: "string", title: "string", description: "string", reward: "string",
			targets: "string", duration: "string", image: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var info : Duvido.Challenge.CreationInfo = {
			owner: user.id,
			title: params.title,
			description: params.description,
			reward: params.reward,
			targets: params.targets.split(","),
			duration: parseInt(params.duration),
			image: params.image ? new Duvido.Image(params.image) : null
		}
		
		var challenge = Duvido.Challenge.create(info);
		
		resp.end();
		
		Tracker.track("Image uploaded", {
			distinct_id: user.id,
			ip: params.ip,
			"Access Token": params.token,
			"Challenge Id": challenge,
			"Title": params.title,
			"Description": params.description,
			"Reward": params.reward,
			"Targets": params.targets.split(","),
			"Duration (s)": parseInt(params.duration),
			"Image Id": params.image || null
		});
		
		Tracker.people.increment(user.id, "Challenges Created");
		
		params.targets.split(",").forEach(target => {
			Tracker.people.increment(target, "Challenges Received");
		});
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
			creationTime : string
			title : string
			description : string
			reward : string
			duration : number
			imageId : string
			videoId : string
			targets : {
				id : string
				name : string
				status : string // "sent" | "received" | "read" | "submitted" | "rewarded"
				submissions : {
					status : string // "waiting" | "accepted" | "rejected"
					text : string
					imageId : string
					videoId : string
					sentTime : string
					judgedTime : string
				}[]
			}[]
		}[] = [];
		
		var user = Duvido.User.fromToken(params.token);
		var challenges = Duvido.Challenge.listFromOwner(user);
		
		// Sort by creation date
		challenges = challenges.sort((a, b) => {
			return b.data.creationTime.getTime() - a.data.creationTime.getTime();
		});
		
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
				creationTime: c.creationTime.getTime()+"",
				title: c.title,
				description: c.description,
				reward: c.reward,
				duration: c.duration,
				imageId: c.imageId,
				videoId: c.videoId,
				targets: c.targets.map(target => {return {
					id: target.id,
					name: names[target.id],
					status: target.status,
					submissions: target.submissions.map(submission => {return {
						status: submission.status,
						text: submission.text,
						imageId: submission.imageId,
						videoId: submission.videoId,
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
			creationTime : string
			owner : {id : string, name : string}
			title : string
			description : string
			reward : string
			duration : number
			imageId : string
			videoId : string
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
				creationTime: c.creationTime.getTime()+"",
				owner: {id : c.owner, name: names[c.owner]},
				title: c.title,
				description: c.description,
				reward: c.reward,
				duration: c.duration,
				imageId: c.imageId,
				videoId: c.videoId
			});
		});
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify(infos));
		resp.end();
	}
}
