import {scheduleDeadline} from './deadline.js';

/** Platform fetch shape; native or test implementations may be injected. */
export type RequestImplementation = typeof fetch;

type RequestBody = {readonly body?: Exclude<RequestInit['body'], undefined>; readonly json?: never}
  | {readonly body?: never; readonly json: unknown};

export type HttpRequestOptions = Omit<RequestInit, 'body' | 'headers' | 'signal'> & RequestBody & {
  readonly headers?: Exclude<RequestInit['headers'], undefined>;
  readonly requestImplementation?: RequestImplementation;
  readonly signal?: AbortSignal;
  /** Milliseconds across request and consumer; zero/omitted disables the deadline. */
  readonly timeout?: number;
};

export class HttpRequestError extends Error {
  readonly kind: 'abort' | 'timeout';

  constructor(kind: 'abort' | 'timeout', cause?: unknown) {
    super(kind === 'abort' ? 'HTTP request canceled.' : 'HTTP request timed out.', {cause});
    this.kind = kind;
    this.name = 'HttpRequestError';
  }
}

const pending = <T>() => {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((fulfill, refuse) => {
    resolve = fulfill;
    reject = refuse;
  });
  return {promise, reject: reject!, resolve: resolve!};
};

export interface HttpRequestOperation<T> {
  readonly cancel: (reason?: unknown) => void;
  readonly result: Promise<T>;
  /** Joins original request, returned consumer promise and owned late-body cleanup; not remote outcome. */
  readonly settled: Promise<void>;
}

/** Bounded publication and original settlement are deliberately independent. */
export const startHttpRequest = <T>(
  url: string, options: HttpRequestOptions, consumeResponse: (response: Response) => T | Promise<T>
): HttpRequestOperation<T> => {
  const result = pending<T>();
  const settled = pending<undefined>();
  // Legacy callers observe only result. Keep the actual settled rejection observable,
  // without creating unhandled rejection noise for the unreturned original chain.
  void result.promise.catch(() => undefined);
  void settled.promise.catch(() => undefined);
  let published = false;
  let cancellation: HttpRequestError | undefined;
  let cancelOperation: (reason?: unknown) => void = () => undefined;
  let clearDeadline: (() => void) | undefined;
  let removeCaller: (() => void) | undefined;
  const cleanupPublication = (): void => {
    clearDeadline?.();
    removeCaller?.();
  };
  const reject = (error: unknown): void => {
    if(!published) {
      published = true;
      cleanupPublication();
      result.reject(error);
    }
  };
  const handle = Object.freeze({cancel: (reason?: unknown) => cancelOperation(reason),
    result: result.promise, settled: settled.promise});
  try {
    // Include synchronous option/header/JSON setup in the absolute operation budget.
    const startedAt = performance.now();
    const {body, headers, json, requestImplementation = globalThis.fetch,
      signal, timeout = 0, ...requestOptions} = options;
    if(signal?.aborted) {
      throw new HttpRequestError('abort', signal.reason);
    }
    if(!Number.isFinite(timeout) || timeout < 0) {
      throw new TypeError('HTTP timeout must be a finite nonnegative number.');
    }
    const hasJson = Object.hasOwn(options, 'json');
    if(hasJson && Object.hasOwn(options, 'body')) {
      throw new TypeError('HTTP raw body and JSON payload are mutually exclusive.');
    }
    const requestHeaders = new Headers(headers);
    if(hasJson && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }
    const controller = new AbortController();
    const cancel = (error: HttpRequestError): void => {
      if(!cancellation && !published) {
        cancellation = error;
        reject(error);
        controller.abort(error);
      }
    };
    cancelOperation = (reason) => cancel(new HttpRequestError('abort', reason));
    const check = (): void => {
      if(signal?.aborted) {
        cancel(new HttpRequestError('abort', signal.reason));
      }
      if(timeout > 0 && performance.now() - startedAt >= timeout) {
        cancel(new HttpRequestError('timeout'));
      }
      if(cancellation) {
        throw cancellation;
      }
    };
    const onAbort = (): void => cancel(new HttpRequestError('abort', signal?.reason));
    signal?.addEventListener('abort', onAbort, {once: true});
    removeCaller = () => signal?.removeEventListener('abort', onAbort);
    check();
    if(timeout > 0) {
      clearDeadline = scheduleDeadline(Math.max(0, timeout - (performance.now() - startedAt)),
        () => cancel(new HttpRequestError('timeout')));
      // The scheduler can expire synchronously; clear the returned cancellation handle too.
      if(published) {
        clearDeadline();
      }
    }
    let cleanupFailed = false;
    const original = (async (): Promise<T> => {
      check();
      const payload = hasJson ? JSON.stringify(json) : body;
      check();
      const response = await requestImplementation(url, {
        ...requestOptions, ...(payload === undefined ? {} : {body: payload}),
        headers: requestHeaders, signal: controller.signal
      });
      try {
        check();
      } catch(error) {
        // Only the not-yet-consumed late Response belongs to this cleanup path.
        // An entered consumer must await all body work/cleanup it initiates.
        try {
          await response.body?.cancel();
        } catch{
          cleanupFailed = true;
        }
        throw error;
      }
      const value = await consumeResponse(response);
      check();
      return value;
    })();
    void original.then((value) => {
      try {
        check();
        if(!published) {
          published = true;
          cleanupPublication();
          result.resolve(value);
        }
      } catch(error) {
        reject(error);
      }
    }, (error: unknown) => reject(cancellation ?? error));
    const join = (): void => {
      if(cleanupFailed) {
        settled.reject(new Error('HTTP request cleanup not proven.'));
      } else {
        settled.resolve(undefined);
      }
    };
    void original.then(join, join);
  } catch(error) {
    reject(error);
    settled.resolve(undefined);
  }
  return handle;
};

/** Domain status, redirect validation and decoding execute inside the shared operation. */
export const httpRequest = async <T>(
  url: string, options: HttpRequestOptions, consumeResponse: (response: Response) => T | Promise<T>
): Promise<T> => startHttpRequest(url, options, consumeResponse).result;

export {BinaryResponseError, readBinaryResponse} from './binaryResponse.js';

export {assertHttpSuccess, type HttpStatusOptions} from './httpResponse.js';
