export = Mixpanel;

import Http = require("http");
import QueryString = require("querystring");

module Mixpanel {
	export var token = "3f5044023c93ed5fbc36b82d66cfc4f8";
	
	type BasicPropertyValue = string|number|boolean|Date;
	type ArrayPropertyValue = string[]|number[]|boolean[]|Date[];
	type PropertyValue = BasicPropertyValue|ArrayPropertyValue;
	
	export class Profile {
		id : string;
		lastSeen : boolean;
		
		constructor(id : string, lastSeen? : boolean) {
			this.id = id;
			this.lastSeen = lastSeen !== undefined ? lastSeen : true;
		}
		
		track(event : string, properties : {[entry : string] : PropertyValue}) {
			this.fixDates(properties);
			properties["token"] = token;
			properties["time"] = Date.now() / 1000;
			properties["distinct_id"] = this.id;
			if (properties["ip"]);
				properties["IP"] = properties["ip"];
			sendMixpanelRequest("/track", {event: event, properties: properties});
		}
		
		set(properties : {[entry : string] : PropertyValue}) {
			this.fixDates(properties);
			this.genericOperation("set", properties);
		}
		
		setOnce(properties : {[entry : string] : PropertyValue}) {
			this.fixDates(properties);
			this.genericOperation("set_once", properties);
		}
		
		add(properties : {[entry : string] : number}) {
			this.genericOperation("add", properties);
		}
		
		append(properties : {[entry : string] : PropertyValue}) {
			this.fixDates(properties);
			this.genericOperation("append", properties);
		}
		
		union(properties : {[entry : string] : ArrayPropertyValue}) {
			this.fixDates(properties);
			this.genericOperation("union", properties);
		}
		
		unset(properties : string[]) {
			this.genericOperation("unset", properties);
		}
		
		delete() {
			this.genericOperation("delete", "");
		}
		
		private genericOperation(name : string, value : any) {
			var data : {[entry : string] : string|number|boolean} = {
				$token: token,
				$distinct_id: this.id,
				$time: Date.now() / 1000,
				$ignore_time: !this.lastSeen
			};
			data["$" + name] = value;
			sendMixpanelRequest("/engage", data);
		}
		
		private fixDates(properties : {[entry : string] : PropertyValue}) {
			Object.keys(properties).forEach(property => {
                var value = properties[property];

                if (value instanceof Date) {
                    properties[property] = value.toISOString();
                }
				
				if (value instanceof Array) {
					if (value[0] instanceof Date) {
                    	properties[property] = (<Date[]>value).map(d => {return d.toISOString();});
					}
				}
            });
		}
	}
}

function sendMixpanelRequest(endpoint : string, data : {}) {
    var requestData = {
        data: new Buffer(JSON.stringify(data)).toString("base64"),
        ip: 0,
    };

    var requestOptions = {
        host: "api.mixpanel.com",
        headers: {},
		path: endpoint + "?" + QueryString.stringify(requestData)
    };

    Http.get(requestOptions);
}
