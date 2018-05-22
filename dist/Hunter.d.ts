/**
 * Copyright (c) 2017-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
export interface HunterOptionsType {
    readonly headers?: Headers;
    readonly isImmutable?: boolean;
    readonly token?: string;
}
/**
 * Hunter: JS utilities for GraphQL
 */
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
