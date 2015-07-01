/// <reference path="../decl/node.d.ts" />
/// <reference path="../decl/piwik-tracker.d.ts" />

export { Tracker };

import * as Http from "http";
import * as Crypto from "crypto";
import PiwikTracker from "piwik-tracker";

var piwik = new PiwikTracker(2, "http://piwik.duvido.vc/piwik.php");

class Tracker {
    ip : string;
    endpoint : string;
    apiVersion : string;
    userId : string;
    name : string;
    start : number;
    
    constructor() {
        this.start = new Date().getTime();
    }
    
    setIp(ip : string) {
        this.ip = ip;
    }
    
    setEndpoint(endpoint : string) {
        this.endpoint = endpoint;
    }
    
    setApiVersion(apiVersion : string) {
        this.apiVersion = apiVersion;
    }
    
    setUserId(userId : string) {
        this.userId = userId;
    }
    
    setName(name : string) {
        this.name = name;
    }
	
    end() {
        var now = new Date();
        piwik.track({
            url: "http://api.duvido.vc" + this.endpoint,
            action_name: 'API',
            cvar: JSON.stringify({
                "1": ["API", this.apiVersion]
            }),
            token_auth: "d75d16ff9e650b074f132f1de028ba81",
            cip: this.ip,
            _id: this.userId ? Crypto.createHash('md5').update(this.userId).digest('hex').substr(0, 16) : null,
            rand: Crypto.randomBytes(16).toString('hex'),
            uid: this.userId + " (" + this.name + ")",
            gt_ms: now.getTime() - this.start,
            h: now.getHours(),
            m: now.getMinutes(),
            s: now.getSeconds()
        });
    }
}
