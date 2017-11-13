"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Immutable = require("immutable");
const lodash_1 = require("lodash");
const ApiError_1 = require("./errors/ApiError");
class HunterUtil extends events_1.EventEmitter {
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
        const { headers, token } = options;
        const { isImmutable } = options;
        url = (url || '').trim();
        const formatToken = (token || '').trim();
        const formatHeaders = headers || new Headers();
        method = (method || 'GET').toUpperCase();
        if (params && method === 'GET') {
            url = `${url}?${this.queryString(params)}`;
            params = null;
        }
        else if (params) {
            params = JSON.stringify(params);
        }
        if (formatToken !== '') {
            formatHeaders.set('Authorization', `Bearer ${formatToken}`);
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
            error = new ApiError_1.ApiError([{ message: 'network_error' }], error);
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
        else if (lodash_1.isString(obj)) {
            return JSON.stringify(obj);
        }
        else if (lodash_1.isPlainObject(obj)) {
            obj = lodash_1.chain(obj).omit(lodash_1.isUndefined).omit(lodash_1.isNull).value();
            const props = [];
            Object.keys(obj).map((key) => {
                const item = obj[key];
                if (lodash_1.isPlainObject(item)) {
                    props.push(this.toGQL(item));
                }
                else if (lodash_1.isArray(item)) {
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
        else if (lodash_1.isArray(obj)) {
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
        const { headers, token } = options;
        url = url ? url.trim() : '';
        const formatToken = (token || '').trim();
        const formatHeaders = headers || new Headers({ 'Content-Type': 'application/graphql' });
        if (formatToken !== '') {
            formatHeaders.set('Authorization', `Bearer ${formatToken}`);
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
            this.emit('rip_hunter_error', error);
            return Promise.reject(error);
        });
    }
    removeSpaces(str) {
        return str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');
    }
}
exports.HunterUtil = HunterUtil;
exports.Hunter = new HunterUtil();
//# sourceMappingURL=Hunter.js.map