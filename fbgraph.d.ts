
declare module "fbgraph" {

	export class Error {
		message : string
		type : string
		code : string
		error_subcode : string
	}
	
	export class User {
		id : string;
	}

    export function get(url : string, params : any, callback : (err : Error, res : any) => void): void;

    export function get(url : "me", params : {access_token : string},
    	callback : (err : Error, user : User) => void): void;

}
