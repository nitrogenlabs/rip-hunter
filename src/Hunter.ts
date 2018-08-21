import * as Immutable from 'immutable';
import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import omit from 'lodash/omit';

import {ApiError} from './errors/ApiError';

if(typeof window === 'undefined') {
  require('fetch-everywhere');
}

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
export class Hunter {
  // AJAX
  static get(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return Hunter.ajax(url, 'GET', params, options);
  }

  static post(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return Hunter.ajax(url, 'POST', params, options);
  }

  static put(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return Hunter.ajax(url, 'PUT', params, options);
  }

  static del(url: string, params?, options?: HunterOptionsType): Promise<any> {
    return Hunter.ajax(url, 'DELETE', params, options);
  }

  static ajax(url: string, method: string, params?, options: HunterOptionsType = {}): Promise<any> {
    const {headers, token} = options;
    const {isImmutable} = options;

    let formatUrl: string = (url || '').trim();
    const formatToken: string = (token || '').trim();
    const formatHeaders: Headers = headers || new Headers();

    // Method
    const formatMethod: string = (method || 'GET').toUpperCase();
    let formatParams;

    // Parameters
    if(params && formatMethod === 'GET') {
      formatUrl = `${formatUrl}?${Hunter.queryString(params)}`;
      formatParams = null;
    } else if(params) {
      formatHeaders.set('Accept', 'application/json');
      formatHeaders.set('Content-Type', 'application/json');
      formatParams = JSON.stringify(params);
    } else {
      formatParams = params;
    }

    // Authentication token
    if(formatToken !== '') {
      formatHeaders.set('Authorization', `Bearer ${formatToken}`);
    }

    let isResponseJSON: boolean;

    return fetch(formatUrl, {body: formatParams, headers: formatHeaders, method: formatMethod})
      .then((response: Response) => {
        const regex = /application\/json/i;

        // Check if response is json
        isResponseJSON = regex.test(response.headers.get('Content-Type') || '');

        if(isResponseJSON) {
          return response.json();
        }

        return response.text();
      })
      .then((results) => {
        if(isResponseJSON) {
          return isImmutable ? Immutable.fromJS(results) : results;
        }

        return results;
      })
      .catch((error) => {
        if((error || {}).message === 'only absolute urls are supported') {
          throw new ApiError([{message: 'invalid_url'}], error);
        }

        throw new ApiError([{message: 'network_error'}], error);
      });
  }

  static queryString(json: object): string {
    return Object
      .keys(json)
      .map((key: string) => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&');
  }

  // GraphQL
  static toGQL(obj): string {
    if(Immutable.Iterable.isIterable(obj)) {
      return Hunter.toGQL(obj.toJS());
    } else if(isString(obj)) {
      return JSON.stringify(obj);
    } else if(isPlainObject(obj)) {
      let cleanObj = omit(obj, isUndefined);
      cleanObj = omit(cleanObj, isNull);

      const gqlProps: string[] = Object.keys(cleanObj).reduce((props: string[], key: string) => {
        const item = obj[key];

        if(isPlainObject(item)) {
          props.push(Hunter.toGQL(item));
        } else if(isArray(item)) {
          const list = item.map((listItem) => Hunter.toGQL(listItem));
          props.push(`${key}: [${list.join(', ')}]`);
        } else {
          const val = JSON.stringify(item);

          if(val) {
            props.push(`${key}: ${val}`);
          }
        }

        return props;
      }, []);

      const values = gqlProps.join(', ');

      if(values === '') {
        return '""';
      }

      return `{${gqlProps.join(', ')}}`;
    } else if(isArray(obj)) {
      return `[${obj.map((objItem) => Hunter.toGQL(objItem)).toString()}]`;
    }

    return obj;
  }

  static query(url: string, body?, options?: HunterOptionsType): Promise<any> {
    const formatBody: string = `query ${body}`;
    return Hunter.getGraph(url, formatBody, options);
  }

  static mutation(url: string, body?, options?: HunterOptionsType): Promise<any> {
    const formatBody: string = `mutation ${body}`;
    return Hunter.getGraph(url, formatBody, options);
  }

  static getGraph(url: string, body?, options: HunterOptionsType = {}): Promise<any> {
    const {isImmutable} = options;
    const {headers, token} = options;
    const formatUrl: string = url ? url.trim() : '';
    const formatToken: string = (token || '').trim();
    const formatHeaders: Headers = headers || new Headers({'Content-Type': 'application/graphql'});

    if(formatToken !== '') {
      formatHeaders.set('Authorization', `Bearer ${formatToken}`);
    }

    return fetch(formatUrl, {body, headers: formatHeaders, method: 'post'})
      .then((response: Response) => {
        const regex: RegExp = /application\/json/i;
        const isJSON: boolean = regex.test(response.headers.get('Content-Type') || '');

        if(isJSON) {
          return response.json();
        }

        return {data: {}};
      })
      .catch((error) => {
        if((error || {}).message === 'only absolute urls are supported') {
          return Promise.reject(new ApiError([{message: 'invalid_url'}], error));
        }

        return Promise.reject(new ApiError([{message: 'network_error'}], error));
      })
      .then((json) => {
        let updatedJson = json;
        if(!updatedJson || updatedJson.errors) {
          if(!updatedJson) {
            updatedJson = {errors: [{message: 'api_error'}]};
          } else if((json.errors || []).some((error) => error.message === 'Must provide query string.')) {
            return Promise.reject(new ApiError([{message: 'required_query'}], new Error()));
          }

          return Promise.reject(new ApiError(json.errors, new Error()));
        }

        const results = json.data || {};
        return isImmutable ? Immutable.fromJS(results) : results;
      })
      .catch((error: ApiError) => {
        let updatedError = error;

        if(!error.source) {
          updatedError = new ApiError([{message: 'network_error'}], error);
        }

        return Promise.reject(updatedError);
      });
  }

  static removeSpaces(str: string): string {
    return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');
  }
}
