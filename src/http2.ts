/// <reference types="node" />
import {connect, constants} from 'node:http2';

import type {ClientHttp2Session, IncomingHttpHeaders, OutgoingHttpHeaders} from 'node:http2';
import type {ConnectionOptions} from 'node:tls';

export type Http2RequestOptions = {
  readonly body?: string;
  readonly headers?: OutgoingHttpHeaders;
  readonly maxResponseBytes?: number;
  readonly method?: string;
  readonly timeout?: number;
};
export type Http2Response = {
  readonly body: string;
  readonly headers: IncomingHttpHeaders;
  readonly status: number;
};

/** Node-only HTTP/2 transport. TLS verification stays enabled; HTTP statuses are returned to the caller. */
export const createHttp2Client = ({origin, tls = {}}: {origin: string; tls?: ConnectionOptions}) => {
  const authority = new URL(origin);
  if(authority.protocol !== 'https:') throw new Error('HTTP/2 requires HTTPS');
  let session: ClientHttp2Session | undefined;
  let closed = false;

  const request = (path: string, options: Http2RequestOptions = {}): Promise<Http2Response> => {
    if(!path.startsWith('/') || path.startsWith('//')) throw new Error('HTTP/2 requires an origin-relative path');
    if(closed) throw new Error('HTTP/2 client is closed');
    const {body, headers = {}, maxResponseBytes = 65536, method = 'GET', timeout = 30000} = options;
    if(!session || session.closed || session.destroyed) {
      session = connect(authority.origin, {...tls, rejectUnauthorized: true});
      // Each pending stream receives session failures through its own error/close events.
      session.on('error', () => undefined);
    }
    const stream = session.request({...headers, ':authority': authority.host, ':method': method, ':path': path, ':scheme': 'https'});
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let responseHeaders: IncomingHttpHeaders = {};
      let settled = false;
      const finish = (error?: Error) => {
        if(settled) return;
        settled = true;
        clearTimeout(timer);
        if(error) {
          reject(error);
          stream.close(constants.NGHTTP2_CANCEL);
        } else {
          resolve({body: Buffer.concat(chunks).toString('utf8'), headers: responseHeaders, status: Number(responseHeaders[':status'])});
        }
      };
      const timer = setTimeout(() => finish(new Error('HTTP/2 request timeout')), timeout);
      stream.on('response', (value) => {responseHeaders = value;});
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if(size > maxResponseBytes) finish(new Error('HTTP/2 response exceeds byte limit'));
        else chunks.push(chunk);
      });
      stream.on('error', finish);
      stream.on('end', () => finish(stream.rstCode || !responseHeaders[':status'] ? new Error('HTTP/2 response interrupted') : undefined));
      stream.on('close', () => finish(new Error('HTTP/2 stream closed before response completed')));
      stream.end(body);
    });
  };

  return {
    close: () => {
      closed = true;
      session?.close();
    },
    request
  };
};
