
declare module "mixpanel" {
	
	export function init(token : string) : Mixpanel;

	export interface Mixpanel {
		people: Mixpanel.People
		track(event : string, properties? : {}, callback? : (e : Error) => void) : void;
	}
	
	module Mixpanel {
		interface People {
			set(person : string, properties : {}, callback? : (e : Error) => void) : void;
			set(person : string, property : string, value : any, callback? : (e : Error) => void) : void;
			set_once(person : string, properties : {}, callback? : (e : Error) => void) : void;
			set_once(person : string, property : string, value : any, callback? : (e : Error) => void) : void;
			increment(person : string, properties : {[prop:string]:number}, callback? : (e : Error) => void) : void;
			increment(person : string, property : string, delta? : number, callback? : (e : Error) => void) : void;
		}
	}
}
