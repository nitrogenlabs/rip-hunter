import {request} from 'node:https';

import {scheduleDeadline} from './deadline.js';

import type {ClientRequest, IncomingMessage, OutgoingHttpHeaders} from 'node:http';
import type {Socket} from 'node:net';
import type {TLSSocket} from 'node:tls';

export class HttpsBytesError extends Error {
  readonly kind: 'connect-timeout' | 'interrupted' | 'limit' | 'timeout';

  constructor(kind: HttpsBytesError['kind'], message: string) {
    super(message);
    this.name = 'HttpsBytesError';
    this.kind = kind;
  }
}

export interface HttpsBytesOptions {
  /** Absolute DNS/TCP/TLS establishment phase in milliseconds; zero/omitted disables it. */
  readonly connectTimeout?: number;
  readonly headers?: OutgoingHttpHeaders;
  /** Node socket inactivity, not an absolute request deadline. */
  readonly idleTimeout?: number;
  /** Domain status policy runs before bytes are consumed. */
  readonly inspectResponse?: (response: IncomingMessage) => void;
  readonly maxBytes: number;
  readonly method?: string;
  readonly payload: Uint8Array;
  readonly requestImplementation?: typeof request;
  /** Caller cancellation, including an independently owned absolute request/body deadline. */
  readonly signal?: AbortSignal;
}

/** Node-only byte transport. Never redirects or retries a request. */
export const httpsBytesRequest = (url: string, options: HttpsBytesOptions): Promise<Buffer> => {
  const {connectTimeout = 0, headers, idleTimeout = 0, inspectResponse, maxBytes, method, payload,
    requestImplementation = request, signal} = options;
  if(!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    return Promise.reject(new RangeError('maxBytes must be a nonnegative safe integer.'));
  }
  if(!Number.isInteger(idleTimeout) || idleTimeout < 0 || idleTimeout > 2147483647) {
    return Promise.reject(new RangeError('idleTimeout must be a supported nonnegative integer.'));
  }
  if(!Number.isSafeInteger(connectTimeout) || connectTimeout < 0) {
    return Promise.reject(new RangeError('connectTimeout must be a nonnegative safe integer.'));
  }
  if(signal?.aborted) {
    return Promise.reject(signal.reason);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let length = 0;
    let settled = false;
    let completed = false;
    let connected = false;
    let outgoing: ClientRequest | undefined;
    let assignedSocket: Socket | undefined;
    let connectedEvent: 'connect' | 'secureConnect' | undefined;
    let cancelConnect = (): void => {};
    const detachSocket = (): void => {
      if(assignedSocket && connectedEvent) {
        assignedSocket.removeListener(connectedEvent, connectionReady);
      }
      assignedSocket = undefined;
      connectedEvent = undefined;
    };
    const connectionReady = (): void => {
      connected = true;
      cancelConnect();
      detachSocket();
      outgoing?.removeListener('socket', onSocket);
    };
    const cleanup = (): void => {
      cancelConnect();
      detachSocket();
      outgoing?.removeListener('socket', onSocket);
      signal?.removeEventListener('abort', abort);
    };
    const fail = (error: unknown): void => {
      if(!settled) {
        settled = true;
        chunks.length = 0;
        reject(error);
      }
    };
    const terminate = (error: unknown, destroy = false): void => {
      if(completed) {
        return;
      }
      completed = true;
      cleanup();
      fail(error);
      if(destroy) {
        outgoing?.destroy(error instanceof Error ? error : undefined);
      }
    };
    const abort = (): void => terminate(signal?.reason, true);
    const onSocket = (socket: Socket): void => {
      if(completed || connected) {
        return;
      }
      detachSocket();
      assignedSocket = socket;
      const tls = socket as TLSSocket;
      // Public TLS readiness and ClientRequest reuse semantics only. A TCP
      // connect event does not complete a new HTTPS handshake.
      if((outgoing?.reusedSocket && !socket.connecting) || (!tls.encrypted && !socket.connecting)) {
        connectionReady();
        return;
      }
      connectedEvent = tls.encrypted ? 'secureConnect' : 'connect';
      socket.once(connectedEvent, connectionReady);
    };
    const startedAt = performance.now();
    try {
      const immutableHeaders = Object.fromEntries(Object.entries(headers || {})
        .map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
      outgoing = requestImplementation(url, {headers: immutableHeaders, method, timeout: idleTimeout}, (response) => {
        connectionReady();
        response.on('end', () => {
          if(completed) {
            return;
          }
          completed = true;
          cleanup();
          if(!settled) {
            settled = true;
            resolve(Buffer.concat(chunks));
            chunks.length = 0;
          }
        });
        // Keep failure listeners safe for late events while a rejected body drains.
        response.on('error', (error) => terminate(error, true));
        response.on('aborted', () => terminate(new HttpsBytesError('interrupted', 'Response body was interrupted.'), true));
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
            terminate(error, true);
          } else {
            chunks.push(chunk);
          }
        });
      });
    } catch(error) {
      terminate(error);
      return;
    }
    outgoing.on('error', (error) => terminate(error));
    outgoing.on('timeout', () => {
      if(!completed) {
        const error = new HttpsBytesError('timeout', 'Request socket timed out.');
        terminate(error, true);
      }
    });
    if(!completed) {
      if(connectTimeout > 0 && !connected) {
        const remaining = connectTimeout - (performance.now() - startedAt);
        const expire = (): void => terminate(new HttpsBytesError('connect-timeout', 'Request connection timed out.'), true);
        if(remaining <= 0) {
          expire();
        } else {
          cancelConnect = scheduleDeadline(remaining, expire);
          outgoing.on('socket', onSocket);
          if(outgoing.socket) {
            onSocket(outgoing.socket);
          }
        }
      }
      if(!completed) {
        signal?.addEventListener('abort', abort);
        if(signal?.aborted) {
          abort();
        }
      }
    }
    if(!completed) {
      try {
        outgoing.end(payload);
      } catch(error) {
        terminate(error, true);
      }
    }
  });
};
