/**
 * Copyright (c) 2017-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

import {ApiError} from './errors/ApiError.js';

const isArray = (value: any): value is any[] => Array.isArray(value);
const isString = (value: any): value is string => typeof value === 'string';
const isPlainObject = (value: any): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !isArray(value);
const isEmpty = (value: any): boolean =>
  value === null || value === undefined || value === '';
const isNull = (value: any): boolean => value === null;
const isUndefined = (value: any): boolean => value === undefined;

// Cache for compiled regex patterns
const JSON_CONTENT_TYPE_REGEX = /application\/json/i;

// Request cache for deduplication
const requestCache = new Map<string, Promise<any>>();

export interface HunterOptionsType {
  readonly headers?: Headers;
  readonly token?: string;
  readonly variables?: any;
  readonly timeout?: number;
  readonly cache?: boolean;
}

export interface HunterQueryType {
  readonly query: string;
  readonly variables?: any;
}

export interface HunterSSEOptionsType {
  readonly headers?: Headers;
  readonly token?: string;
  readonly timeout?: number;
  readonly retryInterval?: number;
  readonly maxRetries?: number;
}

export interface HunterSSEEventType {
  readonly data: string;
  readonly type: string;
  readonly id?: string;
  readonly retry?: number | undefined;
}

export interface HunterSSECallbackType {
  onMessage?: (event: HunterSSEEventType) => void;
  onOpen?: (event: Event) => void;
  onError?: (error: Error | Event) => void;
  onRetry?: (attempt: number, delay: number) => void;
}

export const removeSpaces = (str: string): string =>
  str.replace(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/gm, '');

export const queryString = (json: any): string =>
  Object.keys(json)
    .map(
      (key: string) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(json[key])}`
    )
    .join('&');

// Create a timeout promise
const createTimeout = (ms: number): Promise<never> =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), ms)
  );

// Generate cache key for request deduplication
const generateCacheKey = (url: string, method: string, params?: any, options?: HunterOptionsType): string => {
  const key = JSON.stringify({method, options, params, url});
  return btoa(key).slice(0, 50); // Truncate to reasonable length
};

// SSE EventSource polyfill for Node.js
const createEventSource = (url: string, options?: HunterSSEOptionsType): EventSource => {
  if(typeof EventSource !== 'undefined') {
    return new EventSource(url);
  }

  // For Node.js, we'll throw an error suggesting the user install eventsource
  throw new Error('EventSource not available in this environment. For Node.js support, install the "eventsource" package and import it manually.');
};

// AJAX
export const ajax = (
  url: string,
  method: string,
  params?,
  options: HunterOptionsType = {}
): Promise<any> => {
  const {headers, token, timeout = 30000, cache = false} = options;

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

  // Check cache for GET requests
  if(cache && formatMethod === 'GET') {
    const cacheKey = generateCacheKey(formatUrl, formatMethod, params, options);
    const cached = requestCache.get(cacheKey);
    if(cached) {
      return cached;
    }
  }

  // Create the request promise
  const requestPromise = fetch(formatUrl, {
    body: formatParams,
    headers: formatHeaders,
    method: formatMethod
  })
    .then((response: Response) => {
      // Check if response is json using cached regex
      const isResponseJson = JSON_CONTENT_TYPE_REGEX.test(
        response.headers.get('Content-Type') || ''
      );

      if(isResponseJson) {
        return response.json();
      }

      return response.text();
    })
    .then((results) => results) // Simplified - no need for redundant check
    .catch((error) => {
      if((error || {}).message === 'only absolute urls are supported') {
        return Promise.reject(
          new ApiError([{message: 'invalid_url'}], error)
        );
      }

      return Promise.reject(
        new ApiError([{message: 'network_error'}], error)
      );
    });

  // Add timeout if specified
  const finalPromise = timeout > 0
    ? Promise.race([requestPromise, createTimeout(timeout)])
    : requestPromise;

  // Cache the promise for GET requests
  if(cache && formatMethod === 'GET') {
    const cacheKey = generateCacheKey(formatUrl, formatMethod, params, options);
    requestCache.set(cacheKey, finalPromise);

    // Clean up cache after 5 minutes
    setTimeout(() => requestCache.delete(cacheKey), 300000);
  }

  return finalPromise;
};

export const get = (
  url: string,
  params?,
  options?: HunterOptionsType
): Promise<any> => ajax(url, 'GET', params, options);

export const post = (
  url: string,
  params?,
  options?: HunterOptionsType
): Promise<any> => ajax(url, 'POST', params, options);

export const put = (
  url: string,
  params?,
  options?: HunterOptionsType
): Promise<any> => ajax(url, 'PUT', params, options);

export const del = (
  url: string,
  params?,
  options?: HunterOptionsType
): Promise<any> => ajax(url, 'DELETE', params, options);

// Optimized toGql function
export const toGql = (obj: any): string => {
  if(isString(obj)) {
    return JSON.stringify(obj);
  } else if(isPlainObject(obj)) {
    // Filter out undefined and null values in one pass
    const gqlProps: string[] = [];

    for(const key in obj) {
      if(obj.hasOwnProperty(key)) {
        const item = obj[key];

        // Skip undefined and null values
        if(isUndefined(item) || isNull(item)) {
          continue;
        }

        if(isPlainObject(item)) {
          gqlProps.push(`${key}: ${toGql(item)}`);
        } else if(isArray(item)) {
          const list = item.map((listItem) => toGql(listItem));
          gqlProps.push(`${key}: [${list.join(', ')}]`);
        } else {
          const val = JSON.stringify(item);
          if(val) {
            gqlProps.push(`${key}: ${val}`);
          }
        }
      }
    }

    const values = gqlProps.join(', ');
    return values === '' ? '""' : `{${gqlProps.join(', ')}}`;
  } else if(isArray(obj)) {
    return `[${obj.map((objItem) => toGql(objItem)).join(', ')}]`;
  }

  return String(obj);
};

export const graphqlQuery = (
  url: string,
  query: HunterQueryType | HunterQueryType[],
  options: HunterOptionsType = {}
): Promise<any> => {
  const {headers, token, timeout = 30000} = options;
  const formatUrl: string = url ? url.trim() : '';
  const formatToken: string = (token || '').trim();
  const formatHeaders: Headers =
    headers || new Headers({'Content-Type': 'application/json'});

  if(!isEmpty(formatToken)) {
    formatHeaders.set('Authorization', `Bearer ${formatToken}`);
  }

  const requestPromise = fetch(formatUrl, {
    body: JSON.stringify(query),
    headers: formatHeaders,
    method: 'post'
  })
    .then((response: Response) => {
      const isJson: boolean = JSON_CONTENT_TYPE_REGEX.test(
        response.headers.get('Content-Type') || ''
      );

      if(isJson && response.body) {
        return response.json();
      }

      return null;
    })
    .catch((error) => {
      if((error || {}).message === 'only absolute urls are supported') {
        return Promise.reject(
          new ApiError([{message: 'invalid_url'}], error)
        );
      }

      return Promise.reject(
        new ApiError([{message: 'network_error'}], error)
      );
    })
    .then((json) => {
      if(!json || json.errors) {
        if(!json) {
          return Promise.reject(
            new ApiError([{message: 'api_error'}], new Error())
          );
        } else if(
          (json.errors || []).some(
            (error) => error.message === 'Must provide query string.'
          )
        ) {
          return Promise.reject(
            new ApiError([{message: 'required_query'}], new Error())
          );
        }

        return json.errors
          ? Promise.reject(new ApiError(json.errors, new Error()))
          : {};
      }

      return json.data || {};
    })
    .catch((error: ApiError) =>
      // Simplified error handling - no need to create new error if source exists
      Promise.reject(error.source ? error : new ApiError([{message: 'network_error'}], error))
    );

  // Add timeout if specified
  return timeout > 0
    ? Promise.race([requestPromise, createTimeout(timeout)])
    : requestPromise;
};

// Add query and mutation functions for better API consistency
export const query = (
  url: string,
  body: string,
  options: HunterOptionsType = {}
): Promise<any> => graphqlQuery(url, {query: body}, options);

export const mutation = (
  url: string,
  body: string,
  options: HunterOptionsType = {}
): Promise<any> => graphqlQuery(url, {query: body}, options);

// SSE Support
export const subscribeSSE = (
  url: string,
  callbacks: HunterSSECallbackType,
  options: HunterSSEOptionsType = {}
): (() => void) => {
  const {headers, token, timeout = 30000, retryInterval = 1000, maxRetries = 5} = options;
  const formatUrl: string = (url || '').trim();
  const formatToken: string = (token || '').trim();
  const formatHeaders: Headers = headers || new Headers();

  // Add authorization header if token provided
  if(!isEmpty(formatToken)) {
    formatHeaders.set('Authorization', `Bearer ${formatToken}`);
  }

  let retryCount = 0;
  let eventSource: EventSource | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  const connect = (): void => {
    try {
      eventSource = createEventSource(formatUrl, {headers: formatHeaders});

      // Set up timeout
      if(timeout > 0) {
        timeoutId = setTimeout(() => {
          if(eventSource) {
            eventSource.close();
            if(callbacks.onError) {
              callbacks.onError(new Error('SSE connection timeout'));
            }
          }
        }, timeout);
      }

      // Event handlers
      eventSource.onopen = (event) => {
        if(timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        retryCount = 0; // Reset retry count on successful connection
        if(callbacks.onOpen) {
          callbacks.onOpen(event);
        }
      };

      eventSource.onmessage = (event) => {
        if(callbacks.onMessage) {
          const sseEvent: HunterSSEEventType = {
            data: event.data,
            id: event.lastEventId,
            retry: event.data.includes('retry:') ? parseInt(event.data.split('retry:')[1]) : undefined,
            type: event.type
          };
          callbacks.onMessage(sseEvent);
        }
      };

      eventSource.onerror = (event) => {
        if(timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if(eventSource && eventSource.readyState === EventSource.CLOSED) {
          // Connection closed, attempt retry if within limits
          if(retryCount < maxRetries) {
            retryCount++;
            if(callbacks.onRetry) {
              callbacks.onRetry(retryCount, retryInterval);
            }
            setTimeout(connect, retryInterval);
          } else {
            if(callbacks.onError) {
              callbacks.onError(new Error('SSE connection failed after max retries'));
            }
          }
        } else {
          if(callbacks.onError) {
            callbacks.onError(event);
          }
        }
      };
    } catch(error) {
      if(callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error('Failed to create SSE connection'));
      }
    }
  };

  // Start the connection
  connect();

  // Return cleanup function
  return () => {
    if(timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if(eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
};

export {ApiError} from './errors/ApiError.js';
