
declare module "pmx" {
	
	export function init() : void;

	export function action(name : string, callback : (data : any) => void) : void;

}
