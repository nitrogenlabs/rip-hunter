import EventEmitter from 'events';
import Immutable from 'immutable';
import _ from 'lodash';
import APIError from './errors/APIError';
import 'whatwg-fetch';

/**
 * Copyright (c) 2017, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

class Hunter extends EventEmitter {
  /**
   * Hunter: JS utilities for GraphQL
   *
   * @constructor
   * @this {Hunter}
   */
  constructor() {
    super();
  }

  off(event, listener) {
    this.removeListener(event, listener);
  }

  // AJAX
  get(url, params, options) {
    return this.ajax(url, 'GET', params, options);
  }

  post(url, params, options) {
    return this.ajax(url, 'POST', params, options);
  }

  put(url, params, options) {
    return this.ajax(url, 'PUT', params, options);
  }

  del(url, params, options) {
    return this.ajax(url, 'DELETE', params, options);
  }

  ajax(url, method, params, options = {}) {
    let {
      headers,
      immutable,
      token
    } = options;

    url = (url || '').trim();
    token = (token || '').trim();

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
    if(token !== '') {
      headers = headers || {};
      headers.Authorization = `Bearer ${token}`;
    }

    // Check if response is json
    let isJSON = false;

    return fetch(url, {
      method,
      headers,
      body: params
    })
      .then(response => {
        const regex = /application\/json/i;
        const isJSON = regex.test(response.headers.get('Content-Type') || '');

        if(isJSON) {
          return response.json();
        } else {
          return response.text();
        }
      })
      .then(results => {
        if(isJSON) {
          return immutable ? Immutable.fromJS(results) : results;
        } else {
          return results;
        }
      })
      .catch(error => {
        if((error || {}).message === 'only absolute urls are supported') {
          error = new APIError([{message: 'invalid_url'}], error);
        }

        error = new APIError([{message: 'network_error'}], error);

        this.emit('rip_hunter_error', error);
        throw error;
      });
  }

  queryString(json) {
    return Object.keys(json).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&');
  }

  // GraphQL
  toGQL(obj) {
    if(Immutable.Iterable.isIterable(obj)) {
      return this.toGQL(obj.toJS());
    }
    else if(_.isString(obj) || Array.isArray(obj)) {
      return JSON.stringify(obj);
    }
    else if(_.isObject(obj)) {
      obj = _(obj).omit(_.isUndefined).omit(_.isNull).value();
      let keys = Object.keys(obj);
      let props = [];

      keys.map(k => {
        const item = obj[k];

        if(_.isPlainObject(item)) {
          props.push(this.toGQL(item));
        }
        else if(_.isArray(item)) {
          const list = item.map(o => {
            return this.toGQL(o);
          });

          props.push(`${k}: [${list.join(', ')}]`);
        } else {
          let val = JSON.stringify(item);

          if(val) {
            props.push(`${k}: ${val}`);
          }
        }
      });

      const values = props.join(', ');

      if(values === '') {
        return '""';
      } else {
        return `{${props.join(', ')}}`;
      }
    } else {
      return obj;
    }
  }

  query(url, body, options) {
    body = `query ${body}`;
    return this._getGraph(url, body, options);
  }

  mutation(url, body, options) {
    body = `mutation ${body}`;
    return this._getGraph(url, body, options);
  }

  _getGraph(url, body, options = {}) {
    let {headers, immutable, token} = options;
    url = url ? url.trim() : '';
    token = (token || '').trim();

    if(!headers) {
      headers = {
        'Content-Type': 'application/graphql'
      };
    } else {
      headers = {};
    }

    if(token !== '') {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      method: 'post',
      headers,
      body
    })
      .then(response => {
        const regex = /application\/json/i;
        const isJSON = regex.test(response.headers.get('Content-Type') || '');

        if(isJSON) {
          return response.json();
        } else {
          return {data: {}};
        }
      })
      .catch(error => {
        if((error || {}).message === 'only absolute urls are supported') {
          throw new APIError([{message: 'invalid_url'}], error);
        }

        throw new APIError([{message: 'network_error'}], error);
      })
      .then(json => {
        if(!json || json.errors) {
          if(!json) {
            json = {errors: [{message: 'api_error'}]};
          }
          else if((json.errors || []).some(o => o.message === 'Must provide query string.')) {
            throw new APIError([{message: 'required_query'}], new Error());
          }

          throw new APIError(json.errors, new Error());
        } else {
          const results = json.data || {};
          return immutable ? Immutable.fromJS(results) : results;
        }
      })
      .catch(error => {
        if(!error.source) {
          error = new APIError([{message: 'network_error'}], error);
        }

        this.emit('rip_hunter_error', error);
        throw error;
      });
  }

  removeSpaces(str) {
    return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm,'');
  }
}

const hunter = new Hunter();
export default hunter;
