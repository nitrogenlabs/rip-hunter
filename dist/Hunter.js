<<<<<<< HEAD
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Immutable = require("immutable");
const lodash_1 = require("lodash");
const ApiError_1 = require("./errors/ApiError");
if (typeof window === 'undefined') {
    require('es6-promise/auto');
    require('isomorphic-fetch');
}
class HunterUtil extends events_1.EventEmitter {
    off(event, listener) {
        this.removeListener(event, listener);
    }
    get(url, params, options) {
        return this.ajax(url, 'GET', params, options);
=======
import 'isomorphic-fetch';
import * as Immutable from 'immutable';
import { chain, isArray, isNull, isPlainObject, isString, isUndefined } from 'lodash';
import { ApiError } from './errors/ApiError';
export class Hunter {
    static get(url, params, options) {
        return Hunter.ajax(url, 'GET', params, options);
>>>>>>> Update packages
    }
    static post(url, params, options) {
        return Hunter.ajax(url, 'POST', params, options);
    }
    static put(url, params, options) {
        return Hunter.ajax(url, 'PUT', params, options);
    }
    static del(url, params, options) {
        return Hunter.ajax(url, 'DELETE', params, options);
    }
<<<<<<< HEAD
    ajax(url, method, params, options = {}) {
        const { headers, token } = options;
=======
    static ajax(url, method, params, options = {}) {
        let { headers, token } = options;
>>>>>>> Update packages
        const { isImmutable } = options;
        url = (url || '').trim();
        const formatToken = (token || '').trim();
        const formatHeaders = headers || new Headers();
        method = (method || 'GET').toUpperCase();
        if (params && method === 'GET') {
            url = `${url}?${Hunter.queryString(params)}`;
            params = null;
        }
        else if (params) {
            params = JSON.stringify(params);
        }
<<<<<<< HEAD
        if (formatToken !== '') {
            formatHeaders.set('Authorization', `Bearer ${formatToken}`);
=======
        if (token !== '') {
            headers = Object.assign({}, (headers || {}), { Authorization: `Bearer ${token}` });
>>>>>>> Update packages
        }
        let isJSON;
        return fetch(url, { body: params, headers: formatHeaders, method })
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
                error = new ApiError_1.ApiError([{ message: 'invalid_url' }], error);
            }
<<<<<<< HEAD
            error = new ApiError_1.ApiError([{ message: 'network_error' }], error);
            this.emit('rip_hunter_error', error);
            throw error;
=======
            throw new ApiError([{ message: 'network_error' }], error);
>>>>>>> Update packages
        });
    }
    static queryString(json) {
        return Object
            .keys(json)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`).join('&');
    }
    static toGQL(obj) {
        if (Immutable.Iterable.isIterable(obj)) {
            return Hunter.toGQL(obj.toJS());
        }
        else if (lodash_1.isString(obj)) {
            return JSON.stringify(obj);
        }
        else if (lodash_1.isPlainObject(obj)) {
            obj = lodash_1.chain(obj).omit(lodash_1.isUndefined).omit(lodash_1.isNull).value();
            const props = [];
            Object.keys(obj).map((key) => {
                const item = obj[key];
<<<<<<< HEAD
                if (lodash_1.isPlainObject(item)) {
                    props.push(this.toGQL(item));
                }
                else if (lodash_1.isArray(item)) {
                    const list = item.map((o) => this.toGQL(o));
=======
                if (isPlainObject(item)) {
                    props.push(Hunter.toGQL(item));
                }
                else if (isArray(item)) {
                    const list = item.map((o) => Hunter.toGQL(o));
>>>>>>> Update packages
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
<<<<<<< HEAD
        else if (lodash_1.isArray(obj)) {
            return `[${obj.map((o) => this.toGQL(o)).toString()}]`;
=======
        else if (isArray(obj)) {
            return `[${obj.map((o) => Hunter.toGQL(o)).toString()}]`;
>>>>>>> Update packages
        }
        else {
            return obj;
        }
    }
    static query(url, body, options) {
        body = `query ${body}`;
        return Hunter.getGraph(url, body, options);
    }
    static mutation(url, body, options) {
        body = `mutation ${body}`;
        return Hunter.getGraph(url, body, options);
    }
    static getGraph(url, body, options = {}) {
        const { isImmutable } = options;
        const { headers, token } = options;
        url = url ? url.trim() : '';
<<<<<<< HEAD
        const formatToken = (token || '').trim();
        const formatHeaders = headers || new Headers({ 'Content-Type': 'application/graphql' });
        if (formatToken !== '') {
            formatHeaders.set('Authorization', `Bearer ${formatToken}`);
=======
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
            headers = Object.assign({}, headers, { Authorization: `Bearer ${token}` });
>>>>>>> Update packages
        }
        return fetch(url, { body, headers: formatHeaders, method: 'post' })
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
                return Promise.reject(new ApiError_1.ApiError([{ message: 'invalid_url' }], error));
            }
            return Promise.reject(new ApiError_1.ApiError([{ message: 'network_error' }], error));
        })
            .then((json) => {
            if (!json || json.errors) {
                if (!json) {
                    json = { errors: [{ message: 'api_error' }] };
                }
                else if ((json.errors || []).some((o) => o.message === 'Must provide query string.')) {
                    return Promise.reject(new ApiError_1.ApiError([{ message: 'required_query' }], new Error()));
                }
                return Promise.reject(new ApiError_1.ApiError(json.errors, new Error()));
            }
            else {
                const results = json.data || {};
                return isImmutable ? Immutable.fromJS(results) : results;
            }
        })
            .catch((error) => {
            if (!error.source) {
                error = new ApiError_1.ApiError([{ message: 'network_error' }], error);
            }
            return Promise.reject(error);
        });
    }
    static removeSpaces(str) {
        return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');
    }
}
<<<<<<< HEAD
exports.HunterUtil = HunterUtil;
exports.Hunter = new HunterUtil();
=======
>>>>>>> Update packages
//# sourceMappingURL=Hunter.js.map