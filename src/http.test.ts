import {httpRequest, HttpRequestError} from './http.js';

const deferred = <T>() => Promise.withResolvers<T>();
const response = () => new Response('{"ok":true}', {headers: {'Content-Type': 'application/json'}, status: 200});

describe('httpRequest lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('injects request, preserves URL and options, clones caller Headers', async () => {
    const headers = new Headers({Accept: 'application/custom'});
    const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      (init?.headers as Headers).set('X-Test', 'request-only');
      return response();
    });
    const consume = vi.fn(async (value: Response) => ({
      body: await value.json(), headers: value.headers, ok: value.ok, status: value.status, url: value.url
    }));
    const result = await httpRequest('https://fixture.invalid/path?already=encoded%20value', {
      cache: 'no-store', credentials: 'omit', headers, json: {value: 1}, method: 'POST', redirect: 'error', requestImplementation: request
    }, consume);

    expect(result).toMatchObject({body: {ok: true}, ok: true, status: 200, url: ''});
    expect(result.headers.get('Content-Type')).toBe('application/json');
    expect(request).toHaveBeenCalledWith('https://fixture.invalid/path?already=encoded%20value', expect.objectContaining({
      body: '{"value":1}', cache: 'no-store', credentials: 'omit', method: 'POST', redirect: 'error'
    }));

    const sent = request.mock.calls[0][1]!;

    expect((sent.headers as Headers).get('Content-Type')).toBe('application/json');
    expect(headers.has('Content-Type')).toBe(false);
    expect(headers.has('X-Test')).toBe(false);
    expect(consume).toHaveBeenCalledTimes(1);
  });

  it('preserves raw bytes and explicit Content-Type without JSON coercion', async () => {
    const body = new Uint8Array([0, 255, 129]);
    const request = vi.fn(async () => new Response(null, {status: 204}));

    expect(await httpRequest('https://fixture.invalid', {
      body, headers: {'Content-Type': 'audio/custom'}, method: 'POST', requestImplementation: request
    }, (value) => value.status)).toBe(204);
    expect(request).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({body}));

    const json = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response());
    await httpRequest('https://fixture.invalid', {headers: {'Content-Type': 'custom/json'}, json: false, requestImplementation: json}, (value) => value.text());

    expect((json.mock.calls[0][1]!.headers as Headers).get('Content-Type')).toBe('custom/json');
  });

  it.each(['raw', undefined])('rejects raw+json before request with raw %s', async (body) => {
    const request = vi.fn(async () => response());
    const options = {body, json: {}, requestImplementation: request};

    // Exercise a malformed runtime input that the public union rejects statically.
    await expect(httpRequest('https://fixture.invalid', options as never, (value) => value.text())).rejects.toBeInstanceOf(TypeError);
    expect(request).not.toHaveBeenCalled();
  });

  it('keeps HTTP status/redirect decisions and parser failure local', async () => {
    const fixture = new Response('not-json', {status: 503});
    Object.defineProperty(fixture, 'url', {value: 'https://redirect.invalid/other'});
    const requestImplementation = vi.fn(async () => fixture);

    expect(await httpRequest('https://fixture.invalid', {requestImplementation}, (value) => ({status: value.status, url: value.url}))).toEqual({status: 503, url: 'https://redirect.invalid/other'});

    const error = new Error('domain redirect rejected before parsing');
    const consume = vi.fn(() => {
      throw error;
    });

    await expect(httpRequest('https://fixture.invalid', {requestImplementation}, consume)).rejects.toBe(error);
  });

  it('has no default deadline and removes caller listeners after success', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, 'addEventListener');
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    await httpRequest('https://fixture.invalid', {requestImplementation: async () => response(), signal: controller.signal}, (value) => value.json());

    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('abort', add.mock.calls[0][1]);
  });

  it('rejects pre-aborted caller without invoking request or consumer', async () => {
    const controller = new AbortController();
    const reason = new Error('caller canceled');
    controller.abort(reason);
    const request = vi.fn(async () => response());
    const consume = vi.fn((value: Response) => value.text());
    const promise = httpRequest('https://fixture.invalid', {requestImplementation: request, signal: controller.signal}, consume);

    await expect(promise).rejects.toMatchObject({cause: reason, kind: 'abort', name: 'HttpRequestError'});
    expect(request).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it('aborts ignored request and prevents late consumer invocation', async () => {
    const controller = new AbortController();
    const pending = deferred<Response>();
    let sentSignal: AbortSignal | null | undefined;
    const consume = vi.fn((value: Response) => value.text());
    const promise = httpRequest('https://fixture.invalid', {requestImplementation: async (_url, init) => {
      sentSignal = init?.signal;
      return pending.promise;
    }, signal: controller.signal}, consume);
    controller.abort('cancel');

    await expect(promise).rejects.toBeInstanceOf(HttpRequestError);
    expect(sentSignal?.aborted).toBe(true);

    pending.resolve(response());
    await Promise.resolve();

    expect(consume).not.toHaveBeenCalled();
  });

  it('aborts caller during body consumption and cleans timer/listener', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const entered = deferred<undefined>();
    const body = deferred<string>();
    let sentSignal: AbortSignal | null | undefined;
    const promise = httpRequest('https://fixture.invalid', {requestImplementation: async (_url, init) => {
      sentSignal = init?.signal;
      return response();
    }, signal: controller.signal, timeout: 100}, () => {
      entered.resolve(undefined);
      return body.promise;
    });
    await entered.promise;
    controller.abort('body canceled');

    await expect(promise).rejects.toMatchObject({cause: 'body canceled', kind: 'abort'});
    expect(sentSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledOnce();

    body.resolve('late');
  });

  it.each(['fetch', 'body'])('deadline aborts entire %s phase even if implementation ignores cancellation', async (phase) => {
    vi.useFakeTimers();
    const pending = deferred<Response>();
    const body = deferred<string>();
    const entered = deferred<undefined>();
    let sentSignal: AbortSignal | null | undefined;
    const promise = httpRequest('https://fixture.invalid', {requestImplementation: async (_url, init) => {
      sentSignal = init?.signal;
      entered.resolve(undefined);
      return phase === 'fetch' ? pending.promise : response();
    }, timeout: 50}, () => body.promise);
    const rejected = promise.catch((error: unknown) => error);
    await entered.promise;
    await vi.advanceTimersByTimeAsync(50);

    expect(await rejected).toMatchObject({kind: 'timeout'});

    expect(sentSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);

    pending.resolve(response());
    body.resolve('late');
  });

  it('cleans deadline after callback and network failure, preserving exact errors', async () => {
    vi.useFakeTimers();
    const error = new Error('fixture error');
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');

    await expect(httpRequest('https://fixture.invalid', {requestImplementation: async () => response(), signal: controller.signal, timeout: 100}, () => {
      throw error;
    })).rejects.toBe(error);
    await expect(httpRequest('https://fixture.invalid', {requestImplementation: async () => {
      throw error;
    }, timeout: 100}, (value) => value.text())).rejects.toBe(error);
    expect(remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles caller cancellation triggered while cloning headers before request', async () => {
    const controller = new AbortController();
    const headers: [string, string][] = [];
    Object.defineProperty(headers, '0', {get: () => {
      controller.abort('during header setup');
      return ['Accept', 'application/json'];
    }});
    headers.length = 1;
    const request = vi.fn(async () => response());

    await expect(httpRequest('https://fixture.invalid', {headers, requestImplementation: request, signal: controller.signal}, (value) => value.text())).rejects.toMatchObject({kind: 'abort'});
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['toJSON', 'getter'])('does not send after caller abort during JSON %s', async (kind) => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const reason = new Error('canceled while serializing');
    const json = kind === 'toJSON'
      ? {toJSON: () => {
        controller.abort(reason);
        return {};
      }}
      : Object.defineProperty({}, 'value', {enumerable: true, get: () => {
        controller.abort(reason);
        return 1;
      }});
    const request = vi.fn(async () => response());
    const consume = vi.fn((value: Response) => value.text());
    const remove = vi.spyOn(controller.signal, 'removeEventListener');

    await expect(httpRequest('https://fixture.invalid', {
      json, requestImplementation: request, signal: controller.signal, timeout: 100
    }, consume)).rejects.toMatchObject({cause: reason, kind: 'abort'});
    expect(request).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps a finite deadline above the platform timer limit active until the full duration', async () => {
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'performance']});
    const controller = new AbortController();
    let sentSignal: AbortSignal | null | undefined;
    let settled = false;
    const promise = httpRequest('https://fixture.invalid', {
      requestImplementation: async (_url, init) => {
        sentSignal = init?.signal;
        return new Promise<Response>(() => {});
      }, signal: controller.signal, timeout: 2_147_483_657
    }, (value) => value.text());
    const rejected = promise.catch((error: unknown) => { settled = true; return error; });
    await vi.advanceTimersByTimeAsync(2_147_483_647);

    expect(settled).toBe(false);
    expect(sentSignal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(9);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await rejected).toMatchObject({kind: 'timeout'});
    expect(sentSignal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans a large deadline when caller aborts after its first timer interval', async () => {
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'performance']});
    const controller = new AbortController();
    const reason = new Error('cancel large deadline');
    const promise = httpRequest('https://fixture.invalid', {
      requestImplementation: async () => new Promise<Response>(() => {}),
      signal: controller.signal, timeout: 2_147_483_657
    }, (value) => value.text());
    const rejected = promise.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2_147_483_647);
    controller.abort(reason);
    expect(await rejected).toMatchObject({cause: reason, kind: 'abort'});
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([-1, NaN, Infinity])('rejects invalid timeout %s', async (timeout) => {
    await expect(httpRequest('https://fixture.invalid', {requestImplementation: async () => response(), timeout}, (value) => value.text())).rejects.toBeInstanceOf(TypeError);
  });
});
