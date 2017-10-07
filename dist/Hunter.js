import { EventEmitter } from 'events';
import * as Immutable from 'immutable';
import { chain, isArray, isNull, isPlainObject, isString, isUndefined } from 'lodash';
import { ApiError } from './errors/ApiError';
export class HunterUtil extends EventEmitter {
    off(event, listener) {
        this.removeListener(event, listener);
    }
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
        let { headers, token } = options;
        const { isImmutable } = options;
        url = (url || '').trim();
        token = (token || '').trim();
        method = (method || 'GET').toUpperCase();
        if (params && method === 'GET') {
            url = `${url}?${this.queryString(params)}`;
            params = null;
        }
        else if (params) {
            params = JSON.stringify(params);
        }
        if (token !== '') {
            headers = headers || {};
            headers.Authorization = `Bearer ${token}`;
        }
        let isJSON;
        return fetch(url, { body: params, headers, method })
            .then((response) => {
            const regex = /application\/json/i;
            isJSON = regex.test(response.headers.get('Content-Type') || '');
            if (isJSON) {
                return response.json();
            }
            else {
                return response.text();
            }
        })
            .then((results) => {
            if (isJSON) {
                return isImmutable ? Immutable.fromJS(results) : results;
            }
            else {
                return results;
            }
        })
            .catch((error) => {
            if ((error || {}).message === 'only absolute urls are supported') {
                error = new ApiError([{ message: 'invalid_url' }], error);
            }
            error = new ApiError([{ message: 'network_error' }], error);
            this.emit('rip_hunter_error', error);
            throw error;
        });
    }
    queryString(json) {
        return Object
            .keys(json)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&');
    }
    toGQL(obj) {
        if (Immutable.Iterable.isIterable(obj)) {
            return this.toGQL(obj.toJS());
        }
        else if (isString(obj)) {
            return JSON.stringify(obj);
        }
        else if (isPlainObject(obj)) {
            obj = chain(obj).omit(isUndefined).omit(isNull).value();
            const props = [];
            Object.keys(obj).map((key) => {
                const item = obj[key];
                if (isPlainObject(item)) {
                    props.push(this.toGQL(item));
                }
                else if (isArray(item)) {
                    const list = item.map((o) => this.toGQL(o));
                    props.push(`${key}: [${list.join(', ')}]`);
                }
                else {
                    const val = JSON.stringify(item);
                    if (val) {
                        props.push(`${key}: ${val}`);
                    }
                }
            });
            const values = props.join(', ');
            if (values === '') {
                return '""';
            }
            else {
                return `{${props.join(', ')}}`;
            }
        }
        else if (isArray(obj)) {
            return `[${obj.map((o) => this.toGQL(o)).toString()}]`;
        }
        else {
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
        const { isImmutable } = options;
        let { headers, token } = options;
        url = url ? url.trim() : '';
        token = (token || '').trim();
        if (!headers) {
            headers = {
                'Content-Type': 'application/graphql'
            };
        }
        else {
            headers = {};
        }
        if (token !== '') {
            headers.Authorization = `Bearer ${token}`;
        }
        return fetch(url, { body, headers, method: 'post' })
            .then((response) => {
            const regex = /application\/json/i;
            const isJSON = regex.test(response.headers.get('Content-Type') || '');
            if (isJSON) {
                return response.json();
            }
            else {
                return { data: {} };
            }
        })
            .catch((error) => {
            if ((error || {}).message === 'only absolute urls are supported') {
                return Promise.reject(new ApiError([{ message: 'invalid_url' }], error));
            }
            return Promise.reject(new ApiError([{ message: 'network_error' }], error));
        })
            .then((json) => {
            if (!json || json.errors) {
                if (!json) {
                    json = { errors: [{ message: 'api_error' }] };
                }
                else if ((json.errors || []).some((o) => o.message === 'Must provide query string.')) {
                    return Promise.reject(new ApiError([{ message: 'required_query' }], new Error()));
                }
                return Promise.reject(new ApiError(json.errors, new Error()));
            }
            else {
                const results = json.data || {};
                return isImmutable ? Immutable.fromJS(results) : results;
            }
        })
            .catch((error) => {
            if (!error.source) {
                error = new ApiError([{ message: 'network_error' }], error);
            }
            this.emit('rip_hunter_error', error);
            return Promise.reject(error);
        });
    }
    removeSpaces(str) {
        return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');
    }
}
export const Hunter = new HunterUtil();
//# sourceMappingURL=Hunter.js.map