import {scheduleDeadline} from './deadline.js';

export interface GraphQLRequestOperation {
  readonly operationName?: string;
  readonly query: string;
  readonly variables?: Record<string, unknown>;
}

export interface GraphQLRequestOptions {
  readonly headers?: HeadersInit;
  /** Read HTTP error bodies by default; false classifies status immediately. */
  readonly readHttpErrorBody?: boolean;
  readonly requestImplementation?: typeof fetch;
  readonly signal?: AbortSignal;
  /** Disabled by default. A positive timeout cancels the underlying request. */
  readonly timeout?: number;
  readonly token?: string;
}

export interface GraphQLProviderError {
  readonly [key: string]: unknown;
  readonly message?: string;
}

export type GraphQLRequestErrorKind =
  'abort' | 'graphql' | 'http' | 'invalid_response' | 'missing_data' | 'network' | 'timeout';

interface ErrorDetails {
  readonly cause?: unknown;
  readonly errors?: readonly GraphQLProviderError[];
  readonly responseBody?: unknown;
  readonly status?: number;
}

export class GraphQLRequestError extends Error {
  readonly errors: readonly GraphQLProviderError[];
  readonly kind: GraphQLRequestErrorKind;
  readonly responseBody: unknown;
  readonly status: number | undefined;

  constructor(kind: GraphQLRequestErrorKind, message: string, details: ErrorDetails = {}) {
    super(message, {cause: details.cause});
    this.name = 'GraphQLRequestError';
    this.errors = details.errors || [];
    this.kind = kind;
    this.responseBody = details.responseBody;
    this.status = details.status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isProviderError = (value: unknown): value is GraphQLProviderError =>
  isRecord(value) && (value.message === undefined || typeof value.message === 'string');

/** Strict JSON GraphQL transport, independent of sessions, stores and subscriptions. */
export const graphqlRequest = async <T>(
  endpoint: string, operation: GraphQLRequestOperation, options: GraphQLRequestOptions = {}
): Promise<T> => {
  const {headers, readHttpErrorBody = true, requestImplementation = fetch, signal, timeout = 0, token} = options;
  if(signal?.aborted) {
    throw new GraphQLRequestError('abort', 'GraphQL request canceled.', {cause: signal.reason});
  }
  const requestHeaders = new Headers(headers);
  if(!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  if(token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }
  const controller = new AbortController();
  let cancellation: GraphQLRequestError | undefined;
  let rejectCancellation: (error: GraphQLRequestError) => void;
  const canceled = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject;
  });
  const cancel = (error: GraphQLRequestError): void => {
    if(!cancellation) {
      cancellation = error;
      rejectCancellation(error);
      controller.abort();
    }
  };
  const onAbort = (): void => cancel(new GraphQLRequestError('abort', 'GraphQL request canceled.', {cause: signal?.reason}));
  signal?.addEventListener('abort', onAbort, {once: true});
  const expire = (): void => cancel(new GraphQLRequestError('timeout', 'GraphQL request timed out.'));
  const legacyTimer = timeout > 0 && !Number.isFinite(timeout) ? setTimeout(expire, timeout) : undefined;
  const clearDeadline = timeout > 0 && Number.isFinite(timeout) ? scheduleDeadline(timeout, expire) : undefined;
  const request = async (): Promise<T> => {
    const response = await requestImplementation(endpoint, {
      body: JSON.stringify(operation), headers: requestHeaders, method: 'POST', signal: controller.signal
    });
    if(!response.ok && !readHttpErrorBody) {
      throw new GraphQLRequestError('http', `HTTP ${response.status}`, {status: response.status});
    }
    let text: string;
    try {
      text = await response.text();
    } catch(cause) {
      if(!response.ok) {
        throw new GraphQLRequestError('http', `HTTP ${response.status}`, {cause, status: response.status});
      }
      throw new GraphQLRequestError('invalid_response', 'Unreadable GraphQL response body.', {
        cause, status: response.status
      });
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch(cause) {
      if(!response.ok) {
        throw new GraphQLRequestError('http', `HTTP ${response.status}`, {cause, responseBody: text, status: response.status});
      }
      throw new GraphQLRequestError('invalid_response', 'Invalid GraphQL JSON response.', {
        cause, responseBody: text, status: response.status
      });
    }
    const errors = isRecord(body) && Array.isArray(body.errors) ? body.errors.filter(isProviderError) : [];
    const details = {errors, responseBody: body, status: response.status};
    if(!response.ok) {
      throw new GraphQLRequestError('http', `HTTP ${response.status}`, details);
    }
    if(!isRecord(body) || (body.errors !== undefined
      && (!Array.isArray(body.errors) || !body.errors.every(isProviderError)))) {
      throw new GraphQLRequestError('invalid_response', 'Invalid GraphQL response envelope.', details);
    }
    if(errors.length) {
      throw new GraphQLRequestError('graphql', errors[0].message || 'GraphQL request failed.', details);
    }
    if(body.data === undefined) {
      throw new GraphQLRequestError('missing_data', 'GraphQL response contains no data.', details);
    }
    return body.data as T;
  };
  try {
    return await Promise.race([request(), canceled]);
  } catch(cause) {
    if(cancellation) {
      throw cancellation;
    }
    if(cause instanceof GraphQLRequestError) {
      throw cause;
    }
    throw new GraphQLRequestError('network', 'GraphQL network request failed.', {cause});
  } finally {
    clearDeadline?.();
    if(legacyTimer !== undefined) {
      clearTimeout(legacyTimer);
    }
    signal?.removeEventListener('abort', onAbort);
  }
};
