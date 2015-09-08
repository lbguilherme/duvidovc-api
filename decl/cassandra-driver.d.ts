/// <reference path="./node.d.ts" />

declare module "cassandra-driver" {
	import events = require("events");

	export interface ClientOptions {
		contactPoints? : string[]
		policies? : {
			loadBalancing? : LoadBalancingPolicy
			retry? : RetryPolicy
			reconnection? : ReconnectionPolicy
			addressResolution? : AddressTranslator
		}
		queryOptions? : QueryOptions
		pooling? : {
			heartBeatInterval? : number
			coreConnectionsPerHost? : {[host:string]:number}
			warmup? : boolean
		}
		protocolOptions? : {
			port? : number
			maxSchemaAgreementWaitSeconds? : number
			maxVersion? : number
		}
		socketOptions? : {
			connectTimeout? : number
			defunctReadTimeoutThreshold? : number
			keepAlive? : boolean
			keepAliveDelay? : number
			readTimeout? : number
			tcpNoDelay? : boolean
		}
		authProvider? : AuthProvider
		sslOptions? : {}
		encoding? : {}
		keyspace? : string
	}

	export interface QueryOptions {

	}

	type Queries = string[]|{query:string, params:{}}[]
	type ResultCallback = (err : Error, result : ResultSet) => void

	export class Client extends events.EventEmitter {
		hosts : HostMap
		keyspace : string
		metadata : Metadata
		constructor(options : ClientOptions)
		batch(queries : Queries, callback : ResultCallback) : void
		batch(queries : Queries, options : QueryOptions, callback : ResultCallback) : void
		connect(callback : (err : Error) => void) : void
		eachRow(query : string, params : any[]|{}, options : QueryOptions, rowCallback : (n : number, row : Row) => void, callback? : (err : Error, totalCount : number) => void) : void
		eachRow(query : string, params : any[]|{}, rowCallback : (n : number, row : Row) => void, callback? : (err : Error, totalCount : number) => void) : void
		eachRow(query : string, options : QueryOptions, rowCallback : (n : number, row : Row) => void, callback? : (err : Error, totalCount : number) => void) : void
		eachRow(query : string, rowCallback : (n : number, row : Row) => void, callback? : (err : Error, totalCount : number) => void) : void
		execute(query : string, params : any[]|{}, options : QueryOptions, callback : ResultCallback) : void
		execute(query : string, params : any[]|{}, callback : ResultCallback) : void
		execute(query : string, options : QueryOptions, callback : ResultCallback) : void
		execute(query : string, callback : ResultCallback) : void
		getReplicas(keyspace : string, token : Buffer) : Host[]
		shutdown(callback? : Function) : void
		stream(query? : string, params? : any[]|{}, options? : QueryOptions, callback? : (err : Error) => void) : ResultStream
	}

	export class HostMap extends events.EventEmitter {
		forEach(callback : (host : Host) => void) : void
		get(key : string) : Host
		keys() : string[]
		remove(key : string) : void;
		addMultiple(keys : string[]) : void;
		set(key : string, value : Host) : void;
		values() : Host[];

	}

	export class Host extends events.EventEmitter {
		address : string
		cassandraVersion : string
		datacenter : string
		rack : string
		tokens : string[]
		canBeConsideredAsUp() : boolean
		isUp() : boolean
	}

	export class Row {
		[columnName : string] : any
		forEach(callback : (value : any, columnName : string) => void) : void
		get(columnName : string) : any
		keys() : string[]
		values() : any[]
	}

	export class ResultStream {

	}

	export class Metadata {

	}

	export class LoadBalancingPolicy {

	}

	export class RetryPolicy {

	}

	export class ReconnectionPolicy {

	}

	export class AddressTranslator {

	}

	export class AuthProvider {

	}

	export class ResultSet {
		columns : string[]
		info : {
			achievedConsistency : number
			queriedHost : string
			triedHosts : {}
			traceId : string
		}
		pageState : string
		rowLength : number
		rows : Row[]
		first() : Row
	}

}
