/**
 * Copyright (c) 2017-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import isArray from 'lodash/isArray';
import isNull from 'lodash/isNull';
import isPlainObject from 'lodash/isPlainObject';
import isString from 'lodash/isString';
import isUndefined from 'lodash/isUndefined';
import omit from 'lodash/omit';

import {ApiError} from './errors/ApiError';
import {HunterOptionsType} from './types';

if(typeof window === 'undefined') {
  require('fetch-everywhere');
}

/**
 * JS utilities for GraphQL
 */
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
        return results;
      }

      return results;
    })
    .catch((error) => {
      if((error || {}).message === 'only absolute urls are supported') {
        throw new ApiError([{message: 'invalid_url'}], error);
      }

      throw new ApiError([{message: 'network_error'}], error);
    });
};

export const get = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'GET', params, options);

export const post = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'POST', params, options);

export const put = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'PUT', params, options);

export const del = (url: string, params?, options?: HunterOptionsType): Promise<any> => ajax(url, 'DELETE', params, options);

// GraphQL
export const toGQL = (obj: any): string => {
  if(isString(obj)) {
    return JSON.stringify(obj);
  } else if(isPlainObject(obj)) {
    let cleanObj = omit(obj, isUndefined);
    cleanObj = omit(cleanObj, isNull);

    const gqlProps: string[] = Object.keys(cleanObj).reduce((props: string[], key: string) => {
      const item = obj[key];

      if(isPlainObject(item)) {
        props.push(toGQL(item));
      } else if(isArray(item)) {
        const list = item.map((listItem) => toGQL(listItem));
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
    return `[${obj.map((objItem) => toGQL(objItem)).toString()}]`;
  }

  return obj;
};

export const getGraph = (url: string, body?: any, options: HunterOptionsType = {}): Promise<any> => {
  const {headers, token} = options;
  const formatUrl: string = url ? url.trim() : '';
  const formatToken: string = (token || '').trim();
  const formatHeaders: Headers = headers || new Headers({'Content-Type': 'application/json'});

  if(formatToken !== '') {
    formatHeaders.set('Authorization', `Bearer ${formatToken}`);
  }

  return fetch(formatUrl, {body, headers: formatHeaders, method: 'post'})
    .then((response: Response) => {
      const regex: RegExp = /application\/json/i;
      const isJSON: boolean = regex.test(response.headers.get('Content-Type') || '');

      if(isJSON && response.body) {
        return response.json();
      }

      return null; // {data: {}};
    })
    .catch((error) => {
      if((error || {}).message === 'only absolute urls are supported') {
        return Promise.reject(new ApiError([{message: 'invalid_url'}], error));
      }

      return Promise.reject(new ApiError([{message: 'network_error'}], error));
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

export const query = (url: string, body?: string, options?: HunterOptionsType): Promise<any> => {
  const formatBody: string = `query ${body}`;
  return getGraph(url, JSON.stringify({query: formatBody}), options);
};

export const mutation = (url: string, body?: string, options?: HunterOptionsType): Promise<any> => {
  const formatBody: string = `mutation ${body}`;
  return getGraph(url, JSON.stringify({query: formatBody}), options);
};

export const removeSpaces = (str: string): string => str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');

export {ApiError} from './errors/ApiError';
