export = ApiV0;

import ApiBase = require("./ApiBase");
import Duvido = require("./Duvido");
import Utility = require("./Utility");
import Http = require("http");
import await = require("asyncawait/await");
import async = require("asyncawait/async");
import Mixpanel = require("./Mixpanel");
import Notification = require("./Notification");

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
													 dpi : string, width : string, height : string, deviceid : string, playservices : string}) {
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
			
		var profile = new Mixpanel.Profile(user.id);
		
		profile.track("Logged in", {
			ip: params.ip,
			"Name": name,
			"First Name": firstLastNames[0],
			"Last Name": firstLastNames[1],
			"Birthday": birthday.toISOString().substr(0, 10),
			"Gender": gender,
			"Email": email,
			"Api Version": parseInt(params.api.substr(1)),
			"Access Token": params.token,
			"Android Version": params.android,
			"Device Brand": params.brand,
			"Device Model": params.model,
			"Device Name": params.device,
			"Device Id": params.deviceid,
			"Phone": params.phone,
			"Login Method": params.method,
			"App Version": params.version,
			"Screen DPI": parseFloat(params.dpi),
			"Screen Width": parseInt(params.width),
			"Screen Height": parseInt(params.height)
		});
		
		profile.set({
			$ip: params.ip,
			$username: user.id,
			$name: name,
			$first_name: firstLastNames[0],
			$last_name: firstLastNames[1],
			$email: email,
			$phone: params.phone,
			"Birthday": birthday.toISOString().substr(0, 10),
			"Age": user.getAge(params.token),
			"Gender": gender,
			"Access Token": params.token,
			"Api Version": parseInt(params.api.substr(1)),
			"Android Version": params.android,
			"Device Brand": params.brand,
			"Device Model": params.model,
			"Device Name": params.device,
			"Device Id": params.deviceid,
			"Facebook App": /app/i.test(params.method) ? "Yes" : "No",
			"Google Play Services": params.playservices,
			"App Version": params.version,
			"Screen DPI": parseFloat(params.dpi),
			"Screen Width": parseInt(params.width),
			"Screen Height": parseInt(params.height)
		});
		
		profile.setOnce({$created: new Date()});
		profile.add({"Login Count": 1});
	}
	
	post_gcm(resp : Http.ServerResponse, params : {gcmToken : string, token : string}) {
		Utility.typeCheck(params, {gcmToken: "string", token: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		user.addGcmToken(params.gcmToken);
		
		var profile = new Mixpanel.Profile(user.id);
		profile.union({$android_devices : [params.gcmToken]});
		
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
		
		var profile = new Mixpanel.Profile(user.id);
		profile.track("Image uploaded", {
			ip: params.ip,
			"Image Id (SHA512)": image.id,
			"Size": params.body.length,
			"Access Token": params.token
		});
		
		profile.add({"Images Sent": 1});
	}
	
	/**
	 * GET /v0/image
	 * - id: An image id
	 * - size: A hint for the minimum size
	 * 
	 * Returns: BINARY
	 * JPG encoded image.
	 */
	get_image(resp : Http.ServerResponse, params : {id : string, size : string}) {
		Utility.typeCheck(params, {id: "string", size: "string"}, "params");
		
		var image = new Duvido.Image(params.id);
		if (!image.exists()) {
			resp.statusCode = 404;
			resp.end();
			return;
		}
		
		var data = new Duvido.Data(image.getDataIdForSize(parseInt(params.size)));
		
		resp.setHeader("Content-Type", "image/jpeg");
		resp.write(data.getBuffer());
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
		                                                 targets : string, duration : string, imageId? : string, ip : string}) {
		Utility.typeCheck(params, {
			token: "string", title: "string", description: "string", reward: "string",
			targets: "string", duration: "string"}, "params");
		
		var user = Duvido.User.fromToken(params.token);
		var info : Duvido.Challenge.CreationInfo = {
			owner: user.id,
			title: params.title,
			description: params.description,
			reward: params.reward,
			targets: params.targets.split(","),
			duration: parseInt(params.duration),
			image: params.imageId ? new Duvido.Image(params.imageId) : null
		}
		
		var challengeId = Duvido.Challenge.create(info);
		
		resp.end();
		
		var profile = new Mixpanel.Profile(user.id);
		
		profile.track("Challenge created", {
			ip: params.ip,
			"Access Token": params.token,
			"Challenge Id": challengeId,
			"Title": params.title,
			"Description": params.description,
			"Reward": params.reward,
			"Targets": params.targets.split(","),
			"Duration (s)": parseInt(params.duration),
			"Image Id": params.imageId || null
		});
		
		profile.add({"Challenges Created": 1});
		
		var name = user.getName(params.token);
		
		params.targets.split(",").forEach(target => {
			var targetProfile = new Mixpanel.Profile(target, false);
			targetProfile.add({"Challenges Received": 1});
			
			var notification = new Notification(new Duvido.User(target));
			notification.setData({
				type: "basic-forward",
				title: "Você foi desafiado por " + name,
				body: params.title
			});
			notification.send();
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
			ratio : number
		}[] = [];
		
		var user = Duvido.User.fromToken(params.token);
		Duvido.Challenge.markAllFromTargetAsReceivedAsync(user);
		var challenges = Duvido.Challenge.listFromTarget(user);
		
		// Sort by creation date
		challenges = challenges.sort((a, b) => {
			return b.data.creationTime.getTime() - a.data.creationTime.getTime();
		});
		
		// Collect all ids
		var ids : string[] = [];
		var imageIds : string[] = [];
		challenges.forEach(challenge => {
			var id = challenge.data.owner;
			if (ids.indexOf(id) == -1)
				ids.push(id);
			var imageId = challenge.data.imageId;
			if (imageId && imageIds.indexOf(imageId) == -1)
				imageIds.push(imageId);
		});
		
		// Fetch the name of each user
		var names : {[id : string] : string} = {};
		await(ids.map(id => {
			return async(() => {
				names[id] = new Duvido.User(id).getName(params.token);
			})();
		}));
		
		// Fetch the ratio of each image
		var ratios : {[imageId : string] : number} = {};
		await(imageIds.map(imageId => {
			return async(() => {
				ratios[imageId] = new Duvido.Image(imageId).getRatio();
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
				videoId: c.videoId,
				ratio: ratios[c.imageId]
			});
		});
		
		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify(infos));
		resp.end();
	}
	
	/**
	 * POST /v0/refuse
	 * - token: The owner token
	 * - id: challenge id
	 */
	post_refuse(resp : Http.ServerResponse, params : {token : string, id : string, ip : string}) {
		Utility.typeCheck(params, {token: "string", id: "string"}, "params");
		
		var challenge = new Duvido.Challenge(params.id);
		var user = Duvido.User.fromToken(params.token);
		challenge.refuse(user);
		
		resp.end();
		
		var profile = new Mixpanel.Profile(user.id);
		profile.track("Challenge refused", {
			ip: params.ip,
			"Challenge Id": challenge.id,
			"Access Token": params.token,
			"Challenge Owner": challenge.getData().owner
		});
		
		profile.add({"Challenges Refused": 1});
	}
}
