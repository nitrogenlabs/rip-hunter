<<<<<<< HEAD
/// <reference types="node" />
import { EventEmitter } from 'events';
=======
import 'isomorphic-fetch';
export interface RequestHeadersType {
    readonly [key: string]: any;
}
>>>>>>> Update packages
export interface HunterOptionsType {
    readonly headers?: Headers;
    readonly isImmutable?: boolean;
    readonly token?: string;
}
export declare class Hunter {
    static get(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    static post(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    static put(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    static del(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    static ajax(url: string, method: string, params?: any, options?: HunterOptionsType): Promise<any>;
    static queryString(json: object): string;
    static toGQL(obj: any): string;
    static query(url: string, body?: any, options?: HunterOptionsType): Promise<any>;
    static mutation(url: string, body?: any, options?: HunterOptionsType): Promise<any>;
    static getGraph(url: string, body?: any, options?: HunterOptionsType): Promise<any>;
    static removeSpaces(str: string): string;
}
