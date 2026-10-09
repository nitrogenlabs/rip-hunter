import {request} from 'node:https';

import type {IncomingMessage, OutgoingHttpHeaders} from 'node:http';

export class HttpsBytesError extends Error {
  readonly kind: 'interrupted' | 'limit' | 'timeout';

  constructor(kind: HttpsBytesError['kind'], message: string) {
    super(message);
    this.name = 'HttpsBytesError';
    this.kind = kind;
  }
}

export interface HttpsBytesOptions {
  readonly headers?: OutgoingHttpHeaders;
  /** Node socket inactivity, not an absolute request deadline. */
  readonly idleTimeout?: number;
  /** Domain status policy runs before bytes are consumed. */
  readonly inspectResponse?: (response: IncomingMessage) => void;
  readonly maxBytes: number;
  readonly method?: string;
  readonly payload: Uint8Array;
  readonly requestImplementation?: typeof request;
}

/** Node-only byte transport. Never redirects or retries a request. */
export const httpsBytesRequest = (url: string, options: HttpsBytesOptions): Promise<Buffer> => {
  const {headers, idleTimeout = 0, inspectResponse, maxBytes, method, payload, requestImplementation = request} = options;
  if(!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    return Promise.reject(new RangeError('maxBytes must be a nonnegative safe integer.'));
  }
  if(!Number.isInteger(idleTimeout) || idleTimeout < 0 || idleTimeout > 2147483647) {
    return Promise.reject(new RangeError('idleTimeout must be a supported nonnegative integer.'));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    let settled = false;
    let completed = false;
    const fail = (error: unknown): void => {
      if(!settled) {
        settled = true;
        chunks.length = 0;
        reject(error);
      }
    };
    const outgoing = requestImplementation(url, {headers: Object.fromEntries(Object.entries(headers || {}).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])), method, timeout: idleTimeout}, (response) => {
      response.on('end', () => {
        completed = true;
        if(!settled) {
          settled = true;
          resolve(Buffer.concat(chunks));
          chunks.length = 0;
        }
      });
      // Keep failure listeners safe for late events while a rejected body drains.
      response.on('error', fail);
      response.on('aborted', () => fail(new HttpsBytesError('interrupted', 'Response body was interrupted.')));
      try {
        inspectResponse?.(response);
      } catch(error) {
        fail(error);
        response.resume();
        return;
      }
      response.on('data', (chunk: Buffer) => {
        if(settled) {
          return;
        }
        length += chunk.length;
        if(length > maxBytes) {
          const error = new HttpsBytesError('limit', 'Response exceeds the byte limit.');
          completed = true;
          fail(error);
          outgoing.destroy(error);
        } else {
          chunks.push(chunk);
        }
      });
    });
    outgoing.on('error', fail);
    outgoing.on('timeout', () => {
      if(!completed) {
        const error = new HttpsBytesError('timeout', 'Request socket timed out.');
        completed = true;
        fail(error);
        outgoing.destroy(error);
      }
    });
    outgoing.end(payload);
  });
};
