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

		user.registerAction("login", "", "", params.ip, params.token);

		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify({id: user.id,	name: name}));
		resp.end();

		var firstLastNames = user.getFirstLastName(params.token);
		var birthday = user.getBirthday(params.token);
		if (!birthday || isNaN(birthday.getTime()))
			birthday = null;
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
			"Birthday": birthday ? birthday.toISOString().substr(0, 10) : null,
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
			"Birthday": birthday ? birthday.toISOString().substr(0, 10) : null,
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

		user.registerAction("uploaded image", image.id, "", params.ip, params.token);

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
	post_challenge(resp : Http.ServerResponse, params : {token : string, title : string, details : string, reward : string,
		                                                 targets : string, duration : string, imageId? : string, ip : string}) {
		Utility.typeCheck(params, {
			token: "string", title: "string", details: "string", reward: "string",
			targets: "string", duration: "string"}, "params");

		var user = Duvido.User.fromToken(params.token);
		var info : Duvido.Challenge.CreationInfo = {
			owner: user.id,
			title: params.title,
			details: params.details,
			reward: params.reward,
			targets: params.targets.split(","),
			duration: parseInt(params.duration),
			image: params.imageId ? new Duvido.Image(params.imageId) : null
		}

		var challengeId = Duvido.Challenge.create(info);

		resp.end();

		user.registerAction("sent challenge", challengeId, "", params.ip, params.token);

		var profile = new Mixpanel.Profile(user.id);

		profile.track("Challenge created", {
			ip: params.ip,
			"Access Token": params.token,
			"Challenge Id": challengeId,
			"Title": params.title,
			"Details": params.details,
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
			details : string
			reward : string
			duration : number
			imageId : string
			videoId : string
			targets : {
				id : string
				name : string
				status : string // "sent" | "received" | "read" | "submitted" | "rewarded"
				lastSubmissionId : string
				imageId : string
				imageRatio : number
			}[]
		}[] = [];

		var user = Duvido.User.fromToken(params.token);
		var challenges = Duvido.Challenge.listFromOwner(user);

		// Sort by creation date
		challenges = challenges.sort((a, b) => {
			return b.getData().time.getTime() - a.getData().time.getTime();
		});

		// Collect all ids
		var ids : string[] = [];
		challenges.forEach(challenge => {
			challenge.getTargetIds().forEach(id => {
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

		var submissions : {[pair : string] : {subId : string, imageId : string}} = {};
		challenges.forEach(challenge => {
			var list = challenge.listSubmissions();
			list = list.sort((a, b) => {
				return b.sentTime.getTime() - a.sentTime.getTime();
			});
			list.forEach(submission => {
				var pair = submission.challenge + "-" + submission.target;
				submissions[pair] = {
					subId: submission.id,
					imageId: submission.imageId
				};
			});
		});

		var imageIds : string[] = [];
		Object.keys(submissions).forEach(pair => {
			var id = submissions[pair].imageId;
			if (imageIds.indexOf(id) < 0)
				imageIds.push(id);
		});

		// Fetch the ratio of each image
		var ratios : {[imageId : string] : number} = {};
		await(imageIds.map(imageId => {
			return async(() => {
				ratios[imageId] = new Duvido.Image(imageId).getRatio();
			})();
		}));

		// Add all challenges to the final reply list
		challenges.forEach(challenge => {
			var c = challenge.getData();
			infos.push({
				id: c.id,
				creationTime: c.time.getTime()+"",
				title: c.title,
				details: c.details,
				reward: c.reward,
				duration: c.duration,
				imageId: c.imageId,
				videoId: c.videoId,
				targets: challenge.getTargets().map(target => {
					var s = submissions[c.id+"-"+target.id];
					return {
						id: target.id,
						name: names[target.id],
						status: target.status,
						lastSubmissionId: s ? s.subId : "",
						imageId: s ? s.imageId : "",
						imageRatio: s ? ratios[s.imageId] : 0
					};
				})
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
	get_feed(resp : Http.ServerResponse, params : {token : string, ip : string}) {
		Utility.typeCheck(params, {token: "string"}, "params");

		var infos : {
			id : string
			creationTime : string
			owner : {id : string, name : string}
			title : string
			details : string
			reward : string
			duration : number
			imageId : string
			videoId : string
			ratio : number
		}[] = [];

		var user = Duvido.User.fromToken(params.token);
		var challenges = Duvido.Challenge.listFromTarget(user);

		// Filter out expired challenges
		challenges = challenges.filter(challenge => { return !challenge.hasExpired(); });

		// Mark all these challenges as received
		challenges.forEach(challenge => {
			challenge.getTargets().forEach(target => {
				if (target.id == user.id && target.status == "sent") {
					user.registerAction("received challenge", challenge.id, "", params.ip, params.token);
					challenge.markReceived(user);
				}
			});
		});

		// Sort by creation date
		challenges = challenges.sort((a, b) => {
			return b.getData().time.getTime() - a.getData().time.getTime();
		});

		// Collect all ids
		var ids : string[] = [];
		var imageIds : string[] = [];
		challenges.forEach(challenge => {
			var id = challenge.getData().owner;
			if (ids.indexOf(id) == -1)
				ids.push(id);
			var imageId = challenge.getData().imageId;
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
			var c = challenge.getData();
			infos.push({
				id: c.id,
				creationTime: c.time.getTime()+"",
				owner: {id : c.owner, name: names[c.owner]},
				title: c.title,
				details: c.details,
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

		user.registerAction("refused challenge", challenge.id, "", params.ip, params.token);
		challenge.markRefused(user);

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

	/**
	 * POST /v0/submission
	 * - token: The owner token
	 * - challenge: The challenge id
	 * - orientation: The orientation
	 * post data: The binary data of the image
	 *
	 * Returns: Nothing
	 */
	post_submission(resp : Http.ServerResponse, params : {token : string, challenge : string, imageId : string, ip : string}) {
		Utility.typeCheck(params, {token: "string", challenge: "string"}, "params");

		var user = Duvido.User.fromToken(params.token);
		var challenge = new Duvido.Challenge(params.challenge);

		challenge.submitReply(user, new Duvido.Image(params.imageId));

		resp.end();

		var notification = new Notification(new Duvido.User(challenge.getData().owner));
		notification.setData({
			type: "basic-forward",
			title: "Nova resposta",
			body: user.getName(params.token) + " respondeu ao desafio '" + challenge.getData().title + "'",
		});
		notification.send();

		var profile = new Mixpanel.Profile(user.id);
		profile.track("Submission sent", {
			ip: params.ip,
			"Image": params.imageId,
			"Challenge": challenge.id,
			"Access Token": params.token
		});

		profile.add({"Submissions Sent": 1});
	}

	/**
	 * POST /v0/judge
	 * - token: The owner token
	 * - challenge: The challenge id
	 * - submission: The submission id
	 * - accepted: 1 or 0
	 *
	 * Returns: Nothing
	 */
	post_judge(resp : Http.ServerResponse, params : {token : string, submission : string, accepted : string, ip : string}) {
		Utility.typeCheck(params, {token: "string", submission: "string", accepted: "string"}, "params");
		var hasAccepted = params.accepted == "1";

		var user = Duvido.User.fromToken(params.token);
		var subm = Duvido.Challenge.getSubmission(params.submission);
		var challenge = new Duvido.Challenge(subm.challenge);
		var target = new Duvido.User(subm.target);

		challenge.judgeSubmission(params.submission, hasAccepted);

		resp.end();

		var notification = new Notification(target);
		notification.setData({
			type: "basic-forward",
			title: user.getName(params.token) + " " + (hasAccepted ? "aceitou" : "recusou"),
			body: "sua resposta ao desafio '" + challenge.getData().title + "'",
		});
		notification.send();

		var targetProfile = new Mixpanel.Profile(target.id);
		targetProfile.add({"Own Submissions Judged": 1});

		var userProfile = new Mixpanel.Profile(user.id);
		userProfile.track("Submission judged", {
			ip: params.ip,
			"Challenge": challenge.id,
			"Target": target.id,
			"Submission": params.submission,
			"Access Token": params.token
		});

		userProfile.add({"Submissions Judged": 1});
	}

	/**
	 * GET /v0/challenges
	 * - token: user token
	 *
	 * Returns: The "info" variable
	 */
	get_playing(resp : Http.ServerResponse, params : {token : string}) {
		Utility.typeCheck(params, {token: "string"}, "params");

		var infos : {
			id : string
			challengeOwner : {id : string, name : string}
			challenge : string
			creationTime : string
			sentTime : string
			judgeTime : string
			title : string
			details : string
			reward : string
			duration : number
			imageId : string
			videoId : string
			ratio : number
			text : string
			status : string
		}[] = [];

		var user = Duvido.User.fromToken(params.token);
		var submissions = Duvido.Challenge.listSubmissionsFromTarget(user);

		// Sort by creation date
		submissions = submissions.sort((a, b) => {
			return b.sentTime.getTime() - a.sentTime.getTime();
		});

		// Collect all chalenge ids
		var challengeIds : string[] = [];
		var imageIds : string[] = [];
		submissions.forEach(submission => {
			var id = submission.challenge;
			if (challengeIds.indexOf(id) == -1)
				challengeIds.push(id);
			var imageId = submission.imageId;
			if (imageIds.indexOf(imageId) == -1)
				imageIds.push(imageId);
		});

		// Fetch the name of each id
		var challenges : {[id : string] : Duvido.Challenge} = {};
		await(challengeIds.map(id => {
			return async(() => {
				challenges[id] = new Duvido.Challenge(id);
				challenges[id].getData();
			})();
		}));

		// Collect all ids
		var ownerIds : string[] = [];
		challengeIds.forEach(challengeId => {
			var c = challenges[challengeId].getData()
			var id = c.owner;
			if (ownerIds.indexOf(id) == -1)
				ownerIds.push(id);
		});

		// Fetch the name of each user
		var names : {[id : string] : string} = {};
		await(ownerIds.map(id => {
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
		submissions.forEach(s => {
			var c = challenges[s.challenge].getData();
			infos.push({
				id: s.id,
				challengeOwner: {id : c.owner, name: names[c.owner]},
				challenge: c.id,
				creationTime: c.time.getTime()+"",
				sentTime: s.sentTime.getTime()+"",
				judgeTime: s.judgedTime ? s.judgedTime.getTime()+"" : "",
				title: c.title,
				details: c.details,
				reward: c.reward,
				duration: c.duration,
				imageId: s.imageId,
				videoId: s.videoId,
				ratio: ratios[s.imageId],
				text: s.text,
				status: s.status
			});
		});

		resp.setHeader("Content-Type", "application/json; charset=utf-8");
		resp.write(JSON.stringify(infos));
		resp.end();
	}
}
