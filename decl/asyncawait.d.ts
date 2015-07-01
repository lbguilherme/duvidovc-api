﻿// Type definitions for asyncawait
// Project: https://github.com/yortus/asyncawait
// Definitions by: Troy Gerwien <https://github.com/yortus>


/// <reference path="bluebird.d.ts" />

//import { Promise } from "bluebird"

//------------------------- Async -------------------------
interface Async extends AsyncReturnsPromise {
    cps: AsyncAcceptsCallbackReturnsNothing;
    thunk: AsyncReturnsThunk;
    result: AsyncReturnsResult;
    iterable: AsyncIterableReturnsPromise;
}

interface AsyncFunction {
    (fn: Function): Function;
    // These overloads provide enhanced type information to TypeScript users. The strings must match exactly.
    mod(options: 'returns: promise, callback: false, iterable: false'   , maxConcurrency?: number): AsyncReturnsPromise;
    mod(options: 'returns: thunk, callback: false, iterable: false'     , maxConcurrency?: number): AsyncReturnsThunk;
    mod(options: 'returns: result, callback: false, iterable: false'    , maxConcurrency?: number): AsyncReturnsResult;
    mod(options: 'returns: promise, callback: true, iterable: false'    , maxConcurrency?: number): AsyncAcceptsCallbackReturnsPromise;
    mod(options: 'returns: thunk, callback: true, iterable: false'      , maxConcurrency?: number): AsyncAcceptsCallbackReturnsThunk;
    mod(options: 'returns: result, callback: true, iterable: false'     , maxConcurrency?: number): AsyncAcceptsCallbackReturnsResult;
    mod(options: 'returns: none, callback: true, iterable: false'       , maxConcurrency?: number): AsyncAcceptsCallbackReturnsNothing;
    mod(options: 'returns: promise, callback: false, iterable: true'    , maxConcurrency?: number): AsyncIterableReturnsPromise;
    mod(options: 'returns: thunk, callback: false, iterable: true'      , maxConcurrency?: number): AsyncIterableReturnsThunk;
    mod(options: 'returns: result, callback: false, iterable: true'     , maxConcurrency?: number): AsyncIterableReturnsResult;
    mod(options: 'returns: promise, callback: true, iterable: true'     , maxConcurrency?: number): AsyncIterableAcceptsCallbackReturnsPromise;
    mod(options: 'returns: thunk, callback: true, iterable: true'       , maxConcurrency?: number): AsyncIterableAcceptsCallbackReturnsThunk;
    mod(options: 'returns: result, callback: true, iterable: true'      , maxConcurrency?: number): AsyncIterableAcceptsCallbackReturnsResult;
    mod(options: 'returns: none, callback: true, iterable: true'        , maxConcurrency?: number): AsyncIterableAcceptsCallbackReturnsNothing;
    mod(options: string, maxConcurrency?: number): AsyncFunction;
    mod(options: AsyncOptions): AsyncFunction;
}

interface AsyncOptions {
    returnValue?: string; // Recognised values: 'none', 'promise', 'thunk', 'result'
    acceptsCallback?: boolean;
    isIterable?: boolean;
    maxConcurrency?: number;
}

interface AsyncReturnsPromise extends AsyncFunction {
    <TResult>(fn: () => TResult): () => Promise<TResult>;
    <T, TResult>(fn: (arg: T) => TResult): (arg: T) => Promise<TResult>;
    <T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => TResult): (arg1: T1, arg2: T2) => Promise<TResult>;
    <T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3) => TResult): (arg1: T1, arg2: T2, arg3: T3) => Promise<TResult>;
    <T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<TResult>;
}

interface AsyncReturnsThunk extends AsyncFunction {
    <TResult>(fn: () => TResult): () => Thunk<TResult>;
    <T, TResult>(fn: (arg: T) => TResult): (arg: T) => Thunk<TResult>;
    <T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => TResult): (arg1: T1, arg2: T2) => Thunk<TResult>;
    <T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3) => TResult): (arg1: T1, arg2: T2, arg3: T3) => Thunk<TResult>;
    <T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Thunk<TResult>;
}

interface AsyncReturnsResult extends AsyncFunction {
    <TResult>(fn: () => TResult): () => TResult;
    <T, TResult>(fn: (arg: T) => TResult): (arg: T) => TResult;
    <T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => TResult): (arg1: T1, arg2: T2) => TResult;
    <T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3) => TResult): (arg1: T1, arg2: T2, arg3: T3) => TResult;
    <T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult;
}

interface AsyncAcceptsCallbackReturnsPromise extends AsyncFunction {
    <TResult>(fn: () => TResult): (callback?: Callback<TResult>) => Promise<TResult>;
    <T, TResult>(fn: (arg: T) => TResult): (arg: T, callback?: Callback<TResult>) => Promise<TResult>;
    <T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => TResult): (arg1: T1, arg2: T2, callback?: Callback<TResult>) => Promise<TResult>;
    <T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3) => TResult): (arg1: T1, arg2: T2, arg3: T3, callback?: Callback<TResult>) => Promise<TResult>;
    <T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback?: Callback<TResult>) => Promise<TResult>;
}

interface AsyncAcceptsCallbackReturnsThunk extends AsyncFunction {
    <TResult>(fn: () => TResult): (callback?: Callback<TResult>) => Thunk<TResult>;
    <T, TResult>(fn: (arg: T) => TResult): (arg: T, callback?: Callback<TResult>) => Thunk<TResult>;
    <T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => TResult): (arg1: T1, arg2: T2, callback?: Callback<TResult>) => Thunk<TResult>;
    <T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3) => TResult): (arg1: T1, arg2: T2, arg3: T3, callback?: Callback<TResult>) => Thunk<TResult>;
    <T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback?: Callback<TResult>) => Thunk<TResult>;
}

interface AsyncAcceptsCallbackReturnsResult extends AsyncFunction {
    <TResult>(fn: () => TResult): (callback?: Callback<TResult>) => TResult;
    <T, TResult>(fn: (arg: T) => TResult): (arg: T, callback?: Callback<TResult>) => TResult;
    <T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => TResult): (arg1: T1, arg2: T2, callback?: Callback<TResult>) => TResult;
    <T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3) => TResult): (arg1: T1, arg2: T2, arg3: T3, callback?: Callback<TResult>) => TResult;
    <T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback?: Callback<TResult>) => TResult;
}

interface AsyncAcceptsCallbackReturnsNothing extends AsyncFunction {
    <TResult>(fn: () => TResult): (callback?: Callback<TResult>) => void;
    <T, TResult>(fn: (arg: T) => TResult): (arg: T, callback?: Callback<TResult>) => void;
    <T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => TResult): (arg1: T1, arg2: T2, callback?: Callback<TResult>) => void;
    <T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3) => TResult): (arg1: T1, arg2: T2, arg3: T3, callback?: Callback<TResult>) => void;
    <T1, T2, T3, T4, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => TResult): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback?: Callback<TResult>) => void;
}

interface AsyncIterableReturnsPromise extends AsyncFunction {
    (fn: Function): (...args : any[]) => {
        next(): Promise<{ done: boolean; value?: any; }>;
        forEach(callback: (value : any) => void): Promise<void>;
    };
}

interface AsyncIterableReturnsThunk extends AsyncFunction {
    (fn: Function): () => {
        next(): Thunk<{ done: boolean; value?: any; }>;
        forEach(callback: (value : any) => void): Thunk<void>;
    };
}

interface AsyncIterableReturnsResult extends AsyncFunction {
    (fn: Function): () => {
        next(): { done: boolean; value?: any; };
        forEach(callback: (value : any) => void): void;
    };
}

interface AsyncIterableAcceptsCallbackReturnsPromise extends AsyncFunction {
    (fn: Function): () => {
        next(callback?: Callback<any>): Promise<{ done: boolean; value?: any; }>;
        forEach(callback: (value : any) => void, doneCallback?: Callback<void>): Promise<void>;
    };
}

interface AsyncIterableAcceptsCallbackReturnsThunk extends AsyncFunction {
    (fn: Function): () => {
        next(callback?: Callback<any>): Thunk<{ done: boolean; value?: any; }>;
        forEach(callback: (value : any) => void, doneCallback?: Callback<void>): Thunk<void>;
    };
}

interface AsyncIterableAcceptsCallbackReturnsResult extends AsyncFunction {
    (fn: Function): () => {
        next(callback?: Callback<any>): { done: boolean; value?: any; };
        forEach(callback: (value : any) => void, doneCallback?: Callback<void>): void;
    };
}

interface AsyncIterableAcceptsCallbackReturnsNothing extends AsyncFunction {
    (fn: Function): () => {
        next(callback?: Callback<any>): void;
        forEach(callback: (value : any) => void, doneCallback?: Callback<void>): void;
    };
}

//------------------------- Await -------------------------
interface Await extends AwaitFunction {
    in: AwaitFunction;
    top(n: number): AwaitFunction;
}

interface AwaitFunction {
    //<T>(expr: Promise.Thenable<T>): T;
    //<T>(expr: Promise.Thenable<T>[]): T[];
    <T>(expr: Thunk<T>): T;
    <T>(expr: Thunk<T>[]): T[];
    (expr: Object): Object;
}

//------------------------- Common -------------------------
interface Callback<TResult> {
    (err: any, result: TResult): void;
}

interface Thunk<TResult> {
    (callback?: (err : Error, result? : TResult) => void): void;
}

declare module "asyncawait/async" {
    /**
     * Creates a suspendable function. Suspendable functions may use the await() function
     * internally to suspend execution at arbitrary points, pending the results of
     * internal asynchronous operations.
     * @param {Function} fn - Contains the body of the suspendable function. Calls to await()
     *                        may appear inside this function.
     * @returns {Function} A function of the form `(...args) --> Promise`. Any arguments
     *                     passed to this function are passed through to fn. The returned
     *                     promise is resolved when fn returns, or rejected if fn throws.
     */
    export var async: Async;
}

declare module "asyncawait/await" {
    /**
     * Suspends a suspendable function until the given awaitable expression produces
     * a result. If the given expression produces an error, then an exception is raised
     * in the suspendable function.
     * @param {any} expr - The awaitable expression whose results are to be awaited.
     * @returns {any} The final result of the given awaitable expression.
     */
    export var await: Await;
}

declare module "asyncawait" {
    export { async } from "asyncawait/async";
    export { await } from "asyncawait/await";
}