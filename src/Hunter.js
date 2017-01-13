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

  query(url, body, token = '', headers) {
    body = `query ${body}`;
    return this._getGraph(url, body, token, headers);
  }

  mutation(url, body, token = '', headers) {
    body = `mutation ${body}`;
    return this._getGraph(url, body, token, headers);
  }

  _getGraph(url, body, token = '', headers) {
    url = url ? url.trim() : '';
    token = token || '';

    if(!headers) {
      headers = {
        'Content-Type': 'application/graphql',
        'Cache-Control': 'no-cache'
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
        const isJSON = response.headers.getAll('Content-Type').some(type => regex.test(type));

        if(isJSON) {
          return response.json();
        } else {
          return {data:{}};
        }
      })
      .catch(error => {
        if((error || {}).message === 'only absolute urls are supported') {
          throw new APIError(Immutable.fromJS([{message: 'invalid_url'}]), error);
        }

        throw new APIError(Immutable.fromJS([{message: 'network_error'}]), error);
      })
      .then(json => {
        if(!json || json.errors) {
          if(!json) {
            json = {errors: [{message: 'api_error'}]};
          }
          else if((json.errors || []).some(o => o.message === 'Must provide query string.')) {
            throw new APIError(Immutable.fromJS([{message: 'required_query'}]), new Error());
          }

          throw new APIError(Immutable.fromJS(json.errors), new Error());
        } else {
          return Immutable.fromJS(json.data || {});
        }
      })
      .catch(error => {
        if(!error.source) {
          error = new APIError(Immutable.fromJS([{message: 'network_error'}]), error);
        }

        this.emit('rip_hunter_error', error);
        throw error;
      });
  }
}

const hunter = new Hunter();
export default hunter;
