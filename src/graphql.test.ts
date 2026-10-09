import {afterEach, describe, expect, it, vi} from 'vitest';

import {graphqlRequest} from './graphql.js';

const endpoint = 'https://provider.example/graphql';
const operation = {query: 'query Viewer($id: ID!) { viewer(id: $id) { id } }', variables: {id: 'maya'}};
const respond = (body: unknown, status = 200) => vi.fn<typeof fetch>()
  .mockResolvedValue(new Response(JSON.stringify(body), {status}));
const pendingRequest = () => vi.fn<typeof fetch>((_url, init) => new Promise<Response>((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(new Error('fetch aborted')), {once: true});
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('strict GraphQL requests', () => {
  it('serializes operations and variables through the injected request implementation', async () => {
    const requestImplementation = respond({data: {viewer: {id: 'maya'}}});
    const data = await graphqlRequest(endpoint, operation, {requestImplementation});

    expect(data).toEqual({viewer: {id: 'maya'}});
    expect(requestImplementation.mock.calls[0]?.[0]).toBe(endpoint);
    expect(requestImplementation.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(JSON.parse(requestImplementation.mock.calls[0]![1]!.body as string)).toEqual(operation);
    expect(new Headers(requestImplementation.mock.calls[0]![1]!.headers).get('Content-Type')).toBe('application/json');
  });

  it('does not mutate reusable provider headers when supplying a bearer token', async () => {
    const headers = new Headers({Authorization: 'Provider key', 'X-Provider': 'shop'});
    const requestImplementation = vi.fn<typeof fetch>().mockImplementation(async () => new Response('{"data":true}'));
    await graphqlRequest(endpoint, operation, {headers, requestImplementation, token: 'session'});
    await graphqlRequest(endpoint, operation, {headers, requestImplementation});

    expect(headers.get('Authorization')).toBe('Provider key');
    expect(headers.has('Content-Type')).toBe(false);
    expect(new Headers(requestImplementation.mock.calls[0]![1]!.headers).get('Authorization')).toBe('Bearer session');
    expect(new Headers(requestImplementation.mock.calls[0]![1]!.headers).get('X-Provider')).toBe('shop');
    expect(new Headers(requestImplementation.mock.calls[1]![1]!.headers).get('Authorization')).toBe('Provider key');
  });

  it('uses runtime fetch without adding credentials to public requests', async () => {
    const request = respond({data: 'public'});
    vi.stubGlobal('fetch', request);

    expect(await graphqlRequest(endpoint, {query: '{public}'})).toBe('public');
    expect(new Headers(request.mock.calls[0]![1]!.headers).has('Authorization')).toBe(false);
  });

  const explicitData = [null, false, 0, '', [], {}].map((data) => [data]);

  it.each(explicitData)('returns explicitly supplied data: %j', async (data) => {
    const requestImplementation = respond({data, errors: []});

    expect(await graphqlRequest(endpoint, operation, {requestImplementation})).toEqual(data);
  });

  it('rejects partial data with provider errors', async () => {
    const body = {data: {viewer: null}, errors: [{extensions: {code: 'FORBIDDEN'}, message: 'Forbidden'}]};

    await expect(graphqlRequest(endpoint, operation, {requestImplementation: respond(body)}))
      .rejects.toMatchObject({errors: body.errors, kind: 'graphql', responseBody: body, status: 200});
  });

  it('rejects an envelope without data', async () => {
    await expect(graphqlRequest(endpoint, operation, {requestImplementation: respond({errors: []})}))
      .rejects.toMatchObject({kind: 'missing_data', status: 200});
  });

  const malformed = [null, [], 'hello', {data: true, errors: 'broken'}, {data: true, errors: [null]}].map((body) => [body]);

  it.each(malformed)('rejects malformed envelopes: %j', async (body) => {
    await expect(graphqlRequest(endpoint, operation, {requestImplementation: respond(body)}))
      .rejects.toMatchObject({kind: 'invalid_response', responseBody: body, status: 200});
  });

  it.each([
    ['{"errors":[{"message":"Denied"}]}', {errors: [{message: 'Denied'}]}],
    ['<html>Bad gateway</html>', '<html>Bad gateway</html>'],
    ['', '']
  ])('retains HTTP failure status and body: %s', async (text, responseBody) => {
    const requestImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response(text as string, {status: 502}));

    await expect(graphqlRequest(endpoint, operation, {requestImplementation}))
      .rejects.toMatchObject({kind: 'http', responseBody, status: 502});
  });

  it('retains HTTP status even when the error body cannot be read', async () => {
    const response = new Response('used', {status: 503});
    await response.text();

    const requestImplementation = vi.fn<typeof fetch>().mockResolvedValue(response);

    await expect(graphqlRequest(endpoint, operation, {requestImplementation}))
      .rejects.toMatchObject({kind: 'http', status: 503});
  });

  it('retains the original malformed JSON cause', async () => {
    const requestImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response('not json'));

    await expect(graphqlRequest(endpoint, operation, {requestImplementation}))
      .rejects.toMatchObject({cause: expect.any(SyntaxError), kind: 'invalid_response', status: 200});
  });

  it('retains the original network cause', async () => {
    const cause = new TypeError('Network request failed');

    const requestImplementation = vi.fn<typeof fetch>().mockRejectedValue(cause);

    await expect(graphqlRequest(endpoint, operation, {requestImplementation}))
      .rejects.toMatchObject({cause, kind: 'network'});
  });
});

describe('GraphQL request lifecycle', () => {
  it('does not send an already-canceled request', async () => {
    const controller = new AbortController();
    controller.abort('canceled');
    const requestImplementation = respond({data: true});

    await expect(graphqlRequest(endpoint, operation, {requestImplementation, signal: controller.signal}))
      .rejects.toMatchObject({cause: 'canceled', kind: 'abort'});

    expect(requestImplementation).not.toHaveBeenCalled();
  });

  it('aborts an in-flight request and removes the upstream listener', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const requestImplementation = pendingRequest();
    const promise = graphqlRequest(endpoint, operation, {requestImplementation, signal: controller.signal});
    const rejected = promise.catch((error: unknown) => error);
    controller.abort();

    expect(await rejected).toMatchObject({kind: 'abort'});

    expect(requestImplementation.mock.calls[0]![1]!.signal!.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('aborts while reading a streaming response body', async () => {
    const controller = new AbortController();
    const stream = new ReadableStream({start: (output) => output.enqueue(new TextEncoder().encode('{"data":'))});
    const requestImplementation = vi.fn<typeof fetch>().mockResolvedValue(new Response(stream));
    const promise = graphqlRequest(endpoint, operation, {requestImplementation, signal: controller.signal});
    await Promise.resolve();
    await Promise.resolve();
    const rejected = promise.catch((error: unknown) => error);
    controller.abort();

    expect(await rejected).toMatchObject({kind: 'abort'});

    expect(requestImplementation.mock.calls[0]![1]!.signal!.aborted).toBe(true);
  });

  it('aborts on timeout and clears timers and upstream listeners', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const requestImplementation = pendingRequest();
    const promise = graphqlRequest(endpoint, operation, {
      requestImplementation, signal: controller.signal, timeout: 50
    });
    const rejected = promise.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(50);

    expect(await rejected).toMatchObject({kind: 'timeout'});

    expect(requestImplementation.mock.calls[0]![1]!.signal!.aborted).toBe(true);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a large deadline active through request and body until its full duration', async () => {
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'performance']});
    const response = new Response('{"data":true}');
    vi.spyOn(response, 'text').mockImplementation(async () => new Promise<string>(() => {}));
    const requestImplementation = vi.fn<typeof fetch>().mockResolvedValue(response);
    let settled = false;
    const promise = graphqlRequest(endpoint, operation, {requestImplementation, timeout: 2_147_483_657});
    const rejected = promise.catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.advanceTimersByTimeAsync(2_147_483_647);

    expect(settled).toBe(false);
    expect(requestImplementation.mock.calls[0]![1]!.signal!.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(9);

    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);

    expect(await rejected).toMatchObject({kind: 'timeout'});
    expect(requestImplementation.mock.calls[0]![1]!.signal!.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a maximum finite deadline pending and cleans it on caller cancellation after rearming', async () => {
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'performance']});
    const controller = new AbortController();
    const reason = new Error('maximum duration canceled');
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const requestImplementation = pendingRequest();
    let settled = false;
    const promise = graphqlRequest(endpoint, operation, {
      requestImplementation, signal: controller.signal, timeout: Number.MAX_VALUE
    });
    const rejected = promise.catch((error: unknown) => {
      settled = true;
      return error;
    });
    await vi.advanceTimersByTimeAsync(2_147_483_647);

    expect(settled).toBe(false);
    expect(requestImplementation.mock.calls[0]![1]!.signal!.aborted).toBe(false);

    controller.abort(reason);

    expect(await rejected).toMatchObject({cause: reason, kind: 'abort'});
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, -1, NaN])('disables the legacy deadline for %s', async (timeout) => {
    vi.useFakeTimers();
    const requestImplementation = respond({data: true});

    expect(await graphqlRequest(endpoint, operation, {requestImplementation, timeout})).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the single platform timer for legacy positive infinity', async () => {
    vi.useFakeTimers();
    const timer = vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => setInterval(callback, 1000));
    const clear = vi.spyOn(globalThis, 'clearTimeout');

    expect(await graphqlRequest(endpoint, operation, {
      requestImplementation: respond({data: true}), timeout: Infinity
    })).toBe(true);
    expect(timer).toHaveBeenCalledOnce();
    expect(timer).toHaveBeenCalledWith(expect.any(Function), Infinity);
    expect(clear).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([true, false])('cleans up after completed success=%s', async (success) => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const requestImplementation = respond(success ? {data: true} : {errors: [{message: 'No'}]});
    const promise = graphqlRequest(endpoint, operation, {
      requestImplementation, signal: controller.signal, timeout: 50
    });
    if(success) {
      await expect(promise).resolves.toBe(true);
    } else {
      await expect(promise).rejects.toMatchObject({kind: 'graphql'});
    }

    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));

    controller.abort();

    expect(requestImplementation.mock.calls[0]![1]!.signal!.aborted).toBe(false);
  });
});


describe('consumer response classification', () => {
  it('serializes a named operation', async () => {
    const requestImplementation = respond({data: true});
    await graphqlRequest(endpoint, {...operation, operationName: 'Viewer'}, {requestImplementation});

    expect(JSON.parse(requestImplementation.mock.calls[0]![1]!.body as string).operationName).toBe('Viewer');
  });

  it('classifies an interrupted successful body separately from a connection failure', async () => {
    const cause = new TypeError('body interrupted');
    const response = new Response('partial');
    vi.spyOn(response, 'text').mockRejectedValue(cause);

    const requestImplementation = vi.fn<typeof fetch>().mockResolvedValue(response);

    await expect(graphqlRequest(endpoint, operation, {requestImplementation}))
      .rejects.toMatchObject({cause, kind: 'invalid_response', status: 200});
  });

  it.each([401, 403, 500])('classifies status %s without starting an error body when disabled', async (status) => {
    vi.useFakeTimers();
    const response = new Response('never read', {status});
    const text = vi.spyOn(response, 'text').mockImplementation(() => new Promise<string>(() => {}));

    await expect(graphqlRequest(endpoint, operation, {
      readHttpErrorBody: false,
      requestImplementation: vi.fn<typeof fetch>().mockResolvedValue(response),
      timeout: 12_000
    })).rejects.toMatchObject({kind: 'http', status});
    expect(text).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
