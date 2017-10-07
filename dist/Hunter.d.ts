/// <reference types="node" />
import { EventEmitter } from 'events';
export interface RequestHeadersType {
    readonly [key: string]: any;
}
export interface HunterOptionsType {
    readonly headers?: RequestHeadersType;
    readonly isImmutable?: boolean;
    readonly token?: string;
}
export declare class HunterUtil extends EventEmitter {
    off(event: string, listener: (...args: any[]) => void): void;
    get(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    post(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    put(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    del(url: string, params?: any, options?: HunterOptionsType): Promise<any>;
    ajax(url: string, method: string, params?: any, options?: HunterOptionsType): Promise<any>;
    queryString(json: object): string;
    toGQL(obj: any): string;
    query(url: string, body?: any, options?: HunterOptionsType): Promise<any>;
    mutation(url: string, body?: any, options?: HunterOptionsType): Promise<any>;
    _getGraph(url: string, body?: any, options?: HunterOptionsType): Promise<any>;
    removeSpaces(str: string): string;
}
export declare const Hunter: HunterUtil;
