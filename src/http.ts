import {scheduleDeadline} from './deadline.js';

/** Platform fetch shape; native or test implementations may be injected. */
export type RequestImplementation = typeof fetch;

type RequestBody = {readonly body?: BodyInit | null; readonly json?: never}
  | {readonly body?: never; readonly json: unknown};

export type HttpRequestOptions = Omit<RequestInit, 'body' | 'headers' | 'signal'> & RequestBody & {
  readonly headers?: HeadersInit;
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

/** Domain status, redirect validation and decoding execute inside the request lifecycle. */
export const httpRequest = async <T>(
  url: string, options: HttpRequestOptions, consumeResponse: (response: Response) => T | Promise<T>
): Promise<T> => {
  const {
    body, headers, json, requestImplementation = globalThis.fetch, signal, timeout = 0, ...requestOptions
  } = options;
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
  let cancellation: HttpRequestError | undefined;
  let rejectCancellation: (error: HttpRequestError) => void;
  const canceled = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject;
  });
  const cancel = (error: HttpRequestError): void => {
    if(!cancellation) {
      cancellation = error;
      rejectCancellation(error);
      controller.abort(error);
    }
  };
  const onAbort = (): void => cancel(new HttpRequestError('abort', signal?.reason));
  signal?.addEventListener('abort', onAbort, {once: true});
  if(signal?.aborted) {
    onAbort();
  }
  const clearDeadline = timeout > 0 ? scheduleDeadline(timeout, () => cancel(new HttpRequestError('timeout'))) : undefined;
  const request = async (): Promise<T> => {
    if(cancellation) {
      throw cancellation;
    }
    const payload = hasJson ? JSON.stringify(json) : body;
    if(cancellation) {
      throw cancellation;
    }
    const response = await requestImplementation(url, {
      ...requestOptions, ...(payload === undefined ? {} : {body: payload}),
      headers: requestHeaders, signal: controller.signal
    });
    if(cancellation) {
      throw cancellation;
    }
    return consumeResponse(response);
  };
  try {
    return await Promise.race([request(), canceled]);
  } finally {
    clearDeadline?.();
    signal?.removeEventListener('abort', onAbort);
  }
};

export {BinaryResponseError, readBinaryResponse} from './binaryResponse.js';
