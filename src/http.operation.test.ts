import * as http from './http.js';

const deferred = <T>() => Promise.withResolvers<T>();
const tick = async () => {
  for(let i = 0; i < 8; i++) {
    // Sequential microtask boundaries are the behavior under test.
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};
const start = <T>(...args: Parameters<typeof http.startHttpRequest<T>>) => {
  expect(typeof http.startHttpRequest).toBe('function');

  return http.startHttpRequest<T>(...args);
};
const fixture = () => new Response('public', {status: 200});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test('keeps original late response cancellation joined after bounded caller abort', async () => {
  const request = deferred<Response>();
  const cleanup = deferred<undefined>();
  const controller = new AbortController();
  const consume = vi.fn(() => 'wrong');
  const operation = start('https://fixture.invalid', {requestImplementation: () => request.promise, signal: controller.signal}, consume);

  expect(Object.isFrozen(operation)).toBe(true);

  let joined = false;
  void operation.settled.then(() => {
    joined = true;
  });
  const reason = {privateCallerValue: true};
  controller.abort(reason);

  await expect(operation.result).rejects.toMatchObject({cause: reason, kind: 'abort'});

  await tick();

  expect(joined).toBe(false);

  const response = fixture();
  const cancel = vi.spyOn(response.body!, 'cancel').mockReturnValue(cleanup.promise);
  request.resolve(response);
  await tick();

  expect(cancel).toHaveBeenCalledOnce();
  expect(joined).toBe(false);
  expect(consume).not.toHaveBeenCalled();

  cleanup.resolve(undefined);
  await operation.settled;

  expect(joined).toBe(true);
});

test('waits original consumer even when deadline already rejected result', async () => {
  vi.useFakeTimers();
  const body = deferred<string>();
  const entered = deferred<undefined>();
  const operation = start('https://fixture.invalid', {requestImplementation: async () => fixture(), timeout: 10}, () => {
    entered.resolve(undefined);
    return body.promise;
  });
  let joined = false;
  void operation.settled.then(() => {
    joined = true;
  });
  const rejected = operation.result.catch((error: unknown) => error);
  await entered.promise;
  await vi.advanceTimersByTimeAsync(10);

  expect(await rejected).toMatchObject({kind: 'timeout'});

  expect(joined).toBe(false);
  expect(vi.getTimerCount()).toBe(0);

  body.resolve('late success');
  await operation.settled;

  await expect(operation.result).rejects.toMatchObject({kind: 'timeout'});
});

test.each(['reject', 'locked'])('sanitizes %s late body cleanup failure without hiding settled rejection', async (kind) => {
  const request = deferred<Response>();
  const operation = start('https://fixture.invalid', {requestImplementation: () => request.promise}, () => 'wrong');
  operation.cancel('stop');

  await expect(operation.result).rejects.toMatchObject({cause: 'stop', kind: 'abort'});

  const response = fixture();
  const reader = kind === 'locked' ? response.body!.getReader() : undefined;
  if(kind === 'reject') {
    vi.spyOn(response.body!, 'cancel').mockRejectedValue(Error('secret-provider-failure'));
  }
  request.resolve(response);

  await expect(operation.settled).rejects.toThrow('HTTP request cleanup not proven.');

  await operation.settled.catch((error) => {
    expect(error.cause).toBeUndefined();
    expect(String(error)).not.toContain('secret-provider');
  });
  reader?.releaseLock();
});

test('legacy caller sees only result cancellation despite a later cleanup rejection', async () => {
  const request = deferred<Response>();
  const controller = new AbortController();
  const result = http.httpRequest('https://fixture.invalid', {requestImplementation: () => request.promise, signal: controller.signal}, () => 'wrong');
  controller.abort('stop');

  await expect(result).rejects.toMatchObject({kind: 'abort'});

  const response = fixture();
  vi.spyOn(response.body!, 'cancel').mockRejectedValue(Error('private'));
  request.resolve(response);
  await tick(); // Vitest would report an unhandled settlement rejection.
});

test('does not consume or cancel an intentionally handed-off successful stream', async () => {
  const response = fixture();
  const cancel = vi.spyOn(response.body!, 'cancel');
  const operation = start('https://fixture.invalid', {requestImplementation: async () => response}, (value) => value.body);

  expect(await operation.result).toBe(response.body);

  await operation.settled;
  operation.cancel('after terminal');

  expect(cancel).not.toHaveBeenCalled();
  expect(await new Response(response.body).text()).toBe('public');
});

test.each(['request', 'consumer'])('retains original %s error identity but joins original failure', async (phase) => {
  const failure = Error('original domain failure');
  const operation = start('https://fixture.invalid', {requestImplementation: async () => {
    if(phase === 'request') {
      throw failure;
    }
    return fixture();
  }}, () => {
    throw failure;
  });

  await expect(operation.result).rejects.toBe(failure);

  await operation.settled;
});

test.each(['pre-abort', 'invalid-timeout', 'invalid-options'])('returns a frozen handle for %s setup failure without dispatch', async (kind) => {
  const request = vi.fn(async () => fixture());
  const controller = new AbortController();
  if(kind === 'pre-abort') {
    controller.abort('before');
  }
  const options = kind === 'invalid-options' ? null : {requestImplementation: request, signal: controller.signal, timeout: kind === 'invalid-timeout' ? -1 : 0};
  const operation = start('https://fixture.invalid', options as never, () => 'wrong');

  expect(Object.isFrozen(operation)).toBe(true);
  await expect(operation.result).rejects.toBeInstanceOf(Error);

  await operation.settled;
  operation.cancel();

  expect(request).not.toHaveBeenCalled();
});

test('keeps first cancellation reason and resolves join after original rejects', async () => {
  const request = deferred<Response>();
  const controller = new AbortController();
  const operation = start('https://fixture.invalid', {requestImplementation: () => request.promise, signal: controller.signal}, () => 'wrong');
  operation.cancel('first');
  operation.cancel('second');
  controller.abort('third');

  await expect(operation.result).rejects.toMatchObject({cause: 'first'});

  request.reject(Error('late private rejection'));
  await operation.settled;
});

test.each(['headers', 'json'])('enforces elapsed deadline after synchronous %s setup before dispatch', async (phase) => {
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const request = vi.fn(async () => fixture());
  const options = phase === 'json' ? {json: {toJSON: () => {
    clock = 11;
    return {};
  }}}
    : {headers: {get accept() {
      clock = 11;
      return 'application/json';
    }}};
  const operation = start('https://fixture.invalid', {...options, requestImplementation: request, timeout: 10}, () => 'wrong');

  await expect(operation.result).rejects.toMatchObject({kind: 'timeout'});

  await operation.settled;

  expect(request).not.toHaveBeenCalled();
});

test('enforces elapsed deadline after synchronous consumer before publication', async () => {
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const operation = start('https://fixture.invalid', {requestImplementation: async () => fixture(), timeout: 10}, () => {
    clock = 11;
    return 'late';
  });

  await expect(operation.result).rejects.toMatchObject({kind: 'timeout'});

  await operation.settled;
});

test('samples caller abort after synchronous consumer before result publication', async () => {
  const controller = new AbortController();
  const operation = start('https://fixture.invalid', {requestImplementation: async () => fixture(), signal: controller.signal}, () => {
    controller.abort('last');
    return 'late';
  });

  await expect(operation.result).rejects.toMatchObject({cause: 'last', kind: 'abort'});

  await operation.settled;
});

test('joins late responses without bodies after cancellation', async () => {
  const request = deferred<Response>();
  const operation = start('https://fixture.invalid', {requestImplementation: () => request.promise}, () => 'wrong');
  operation.cancel();

  await expect(operation.result).rejects.toMatchObject({kind: 'abort'});

  request.resolve(new Response(null, {status: 204}));
  await operation.settled;
});

test('returns a handle without requiring Promise.withResolvers at runtime', async () => {
  const original = Object.getOwnPropertyDescriptor(Promise, 'withResolvers');
  let operation: ReturnType<typeof http.startHttpRequest<string>>;
  try {
    Object.defineProperty(Promise, 'withResolvers', {configurable: true, value: undefined});
    operation = start('https://fixture.invalid', {requestImplementation: async () => fixture()}, () => 'success');
  } finally {
    Object.defineProperty(Promise, 'withResolvers', original!);
  }

  expect(await operation!.result).toBe('success');

  await operation!.settled;
});

test.each(['cancel', 'deadline'])('gates %s after original consumer continuation but before publication', async (kind) => {
  const controller = new AbortController();
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const operation = start('https://fixture.invalid', {requestImplementation: async () => fixture(), signal: controller.signal, timeout: 10}, () => {
    queueMicrotask(() => queueMicrotask(() => {
      if(kind === 'cancel') {
        controller.abort('publication');
      } else {
        clock = 11;
      }
    }));
    return 'must not publish';
  });

  await expect(operation.result).rejects.toMatchObject({kind: kind === 'cancel' ? 'abort' : 'timeout'});

  await operation.settled;
});

test('preserves synchronous domain error identity when elapsed clock advances before throwing', async () => {
  let clock = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const failure = Error('original domain rejection');
  const operation = start('https://fixture.invalid', {requestImplementation: async () => fixture(), timeout: 10}, () => {
    clock = 11;
    throw failure;
  });

  await expect(operation.result).rejects.toBe(failure);

  await operation.settled;
});
