/**
 * Copyright (c) 2017-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import omit from 'lodash/omit';

import {ApiError} from './errors/ApiError';

if(typeof window === 'undefined') {
  require('fetch-everywhere');
}

export interface HunterOptionsType {
  readonly headers?: Headers;
  readonly token?: string;
  readonly variables?: any;
}

export interface HunterQueryType {
  readonly query: string;
  readonly variables?: any;
}

/**
 * JS utilities for GraphQL
 */
export const removeSpaces = (str: string): string => str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');

export const queryString = (json: any): string => Object
  .keys(json)
  .map((key: string) => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&');

// AJAX
export const ajax = (url: string, method: string, params?, options: HunterOptionsType = {}): Promise<any> => {
  const {headers, token} = options;

  let formatUrl: string = (url || '').trim();
  const formatToken: string = (token || '').trim();
  const formatHeaders: Headers = headers || new Headers();

  // Method
  const formatMethod: string = (method || 'GET').toUpperCase();
  let formatParams;

  // Parameters
  if(params && formatMethod === 'GET') {
    formatUrl = `${formatUrl}?${queryString(params)}`;
    formatParams = null;
  } else if(params) {
    formatHeaders.set('Accept', 'application/json');
    formatHeaders.set('Content-Type', 'application/json');
    formatParams = JSON.stringify(params);
  } else {
    formatParams = params;
  }

  // Authentication token
  if(!isEmpty(formatToken)) {
    formatHeaders.set('Authorization', `Bearer ${formatToken}`);
  }

  let isResponseJson: boolean;

  return fetch(formatUrl, {body: formatParams, headers: formatHeaders, method: formatMethod})
    .then((response: Response) => {
      const regex = /application\/json/i;

      // Check if response is json
      isResponseJson = regex.test(response.headers.get('Content-Type') || '');

      if(isResponseJson) {
        return response.json();
      }

      return response.text();
    })
    .then((results) => {
      if(isResponseJson) {
        return results;
      }

      return results;
    })
    .catch((error) => {
      if((error || {}).message === 'only absolute urls are supported') {
        return Promise.reject(new ApiError([{message: 'invalid_url'}], error));
      }

      return Promise.reject(new ApiError([{message: 'network_error'}], error));
    });
};

export const get = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'GET', params, options);

export const post = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'POST', params, options);

export const put = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'PUT', params, options);

export const del = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'DELETE', params, options);

// GraphQL
export const toGql = (obj: any): string => {
  if(isString(obj)) {
    return JSON.stringify(obj);
  } else if(isPlainObject(obj)) {
    let cleanObj = omit(obj, isUndefined);
    cleanObj = omit(cleanObj, isNull);

    const gqlProps: string[] = Object.keys(cleanObj).reduce((props: string[], key: string) => {
      const item = obj[key];

      if(isPlainObject(item)) {
        props.push(toGql(item));
      } else if(isArray(item)) {
        const list = item.map((listItem) => toGql(listItem));
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
    return `[${obj.map((objItem) => toGql(objItem)).toString()}]`;
  }

  return obj;
};

export const graphqlQuery = (
  url: string,
  query: HunterQueryType | HunterQueryType[],
  options: HunterOptionsType = {}
): Promise<any> => {
  const {headers, token} = options;
  const formatUrl: string = url ? url.trim() : '';
  const formatToken: string = (token || '').trim();
  const formatHeaders: Headers = headers || new Headers({'Content-Type': 'application/json'});

  if(formatToken !== '') {
    formatHeaders.set('Authorization', `Bearer ${formatToken}`);
  }

  return fetch(formatUrl, {body: JSON.stringify(query), headers: formatHeaders, method: 'post'})
    .then((response: Response) => {
      const regex: RegExp = /application\/json/i;
      const isJson: boolean = regex.test(response.headers.get('Content-Type') || '');

      if(isJson && response.body) {
        return response.json();
      }

      return null; // {data: {}};
    })
    .catch((error) => {
      if((error || {}).message === 'only absolute urls are supported') {
        throw new ApiError([{message: 'invalid_url'}], error);
      }

      throw new ApiError([{message: 'network_error'}], error);
    })
    .then((json) => {
      let updatedJson: any = {};

      if(!json || json.errors) {
        if(!json) {
          return Promise.reject(new ApiError([{message: 'api_error'}], new Error()));
        } else if((json.errors || []).some((error) => error.message === 'Must provide query string.')) {
          return Promise.reject(new ApiError([{message: 'required_query'}], new Error()));
        }

        return json.errors ? Promise.reject(new ApiError(json.errors, new Error())) : updatedJson;
      } else if(json) {
        updatedJson = {...json};
      }

      return updatedJson.data || {};
    })
    .catch((error: ApiError) => {
      let updatedError = error;

      if(!error.source) {
        updatedError = new ApiError([{message: 'network_error'}], error);
      }

      return Promise.reject(updatedError);
    });
};

export {ApiError} from './errors/ApiError';
