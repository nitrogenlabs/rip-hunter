import {EventEmitter} from 'events';
import * as Immutable from 'immutable';
import {
  chain,
  isArray,
  isNull,
  isPlainObject,
  isString,
  isUndefined
} from 'lodash';
import {ApiError} from './errors/ApiError';

if (typeof window === 'undefined') {
  require('es6-promise/auto');
  require('isomorphic-fetch');
}
/**
 * Copyright (c) 2017, Nitrogen Labs, Inc.
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
export class HunterUtil extends EventEmitter {
  off(event: string, listener: (...args: any[]) => void): void {
    this.removeListener(event, listener);
  }
  
  // AJAX
  get(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return this.ajax(url, 'GET', params, options);
  }
  
  post(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return this.ajax(url, 'POST', params, options);
  }
  
  put(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return this.ajax(url, 'PUT', params, options);
  }
  
  del(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return this.ajax(url, 'DELETE', params, options);
  }
  
  ajax(url: string, method: string, params?, options: HunterOptionsType = {}): Promise<any> {
    const {headers, token} = options;
    const {isImmutable} = options;
    
    url = (url || '').trim();
    const formatToken: string = (token || '').trim();
    const formatHeaders: Headers = headers || new Headers();

    // Method
    method = (method || 'GET').toUpperCase();
    
    // Parameters
    if(params && method === 'GET') {
      url = `${url}?${this.queryString(params)}`;
      params = null;
    } else if(params) {
      params = JSON.stringify(params);
    }
    
    // Authentication token
    if(formatToken !== '') {
      formatHeaders.set('Authorization', `Bearer ${formatToken}`);
    }
    
    let isJSON: boolean;

    return fetch(url, {body: params, headers: formatHeaders, method})
      .then((response: Response) => {
        const regex = /application\/json/i;
        
        // Check if response is json
        isJSON = regex.test(response.headers.get('Content-Type') || '');
        
        if(isJSON) {
          return response.json();
        } else {
          return response.text();
        }
      })
      .then((results) => {
        if(isJSON) {
          return isImmutable ? Immutable.fromJS(results) : results;
        } else {
          return results;
        }
      })
      .catch((error) => {
        if((error || {}).message === 'only absolute urls are supported') {
          error = new ApiError([{message: 'invalid_url'}], error);
        }
        
        error = new ApiError([{message: 'network_error'}], error);
        
        this.emit('rip_hunter_error', error);
        throw error;
      });
  }
  
  queryString(json: object): string {
    return Object
      .keys(json)
      .map((key: string) => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&');
  }
  
  // GraphQL
  toGQL(obj): string {
    if(Immutable.Iterable.isIterable(obj)) {
      return this.toGQL(obj.toJS());
    } else if(isString(obj)) {
      return JSON.stringify(obj);
    } else if(isPlainObject(obj)) {
      obj = chain(obj).omit(isUndefined).omit(isNull).value();
      const props = [];
      
      Object.keys(obj).map((key: string) => {
        const item = obj[key];
        
        if(isPlainObject(item)) {
          props.push(this.toGQL(item));
        } else if(isArray(item)) {
          const list = item.map((o) => this.toGQL(o));
          props.push(`${key}: [${list.join(', ')}]`);
        } else {
          const val = JSON.stringify(item);
          
          if(val) {
            props.push(`${key}: ${val}`);
          }
        }
      });
      
      const values = props.join(', ');
      
      if(values === '') {
        return '""';
      } else {
        return `{${props.join(', ')}}`;
      }
    } else if(isArray(obj)) {
      return `[${obj.map((o) => this.toGQL(o)).toString()}]`;
    } else {
      return obj;
    }
  }
  
  query(url: string, body?, options?: HunterOptionsType): Promise<any> {
    body = `query ${body}`;
    return this._getGraph(url, body, options);
  }
  
  mutation(url: string, body?, options?: HunterOptionsType): Promise<any> {
    body = `mutation ${body}`;
    return this._getGraph(url, body, options);
  }
  
  _getGraph(url: string, body?, options: HunterOptionsType = {}): Promise<any> {
    const {isImmutable} = options;
    const {headers, token} = options;
    url = url ? url.trim() : '';
    const formatToken: string = (token || '').trim();
    const formatHeaders: Headers = headers || new Headers({'Content-Type': 'application/graphql'});
    
    if(formatToken !== '') {
      formatHeaders.set('Authorization', `Bearer ${formatToken}`);
    }

    return fetch(url, {body, headers: formatHeaders, method: 'post'})
      .then((response: Response) => {
        const regex: RegExp = /application\/json/i;
        const isJSON: boolean = regex.test(response.headers.get('Content-Type') || '');
        
        if(isJSON) {
          return response.json();
        } else {
          return {data: {}};
        }
      })
      .catch((error) => {
        if((error || {}).message === 'only absolute urls are supported') {
          return Promise.reject(new ApiError([{message: 'invalid_url'}], error));
        }
        
        return Promise.reject(new ApiError([{message: 'network_error'}], error));
      })
      .then((json) => {
        if(!json || json.errors) {
          if(!json) {
            json = {errors: [{message: 'api_error'}]};
          } else if((json.errors || []).some((o) => o.message === 'Must provide query string.')) {
            return Promise.reject(new ApiError([{message: 'required_query'}], new Error()));
          }
          
          return Promise.reject(new ApiError(json.errors, new Error()));
        } else {
          const results = json.data || {};
          return isImmutable ? Immutable.fromJS(results) : results;
        }
      })
      .catch((error: ApiError) => {
        if(!error.source) {
          error = new ApiError([{message: 'network_error'}], error);
        }
        
        this.emit('rip_hunter_error', error);
        return Promise.reject(error);
      });
  }
  
  removeSpaces(str: string): string {
    return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');
  }
}

export const Hunter: HunterUtil = new HunterUtil();
