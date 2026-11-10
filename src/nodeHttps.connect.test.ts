import {EventEmitter} from 'node:events';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';

import {httpsBytesRequest} from './nodeHttps.js';

import type {IncomingMessage} from 'node:http';
import type {request} from 'node:https';

vi.mock('node:https', () => ({request: vi.fn(() => {
  throw new Error('Unexpected outbound request');
})}));

class MockResponse extends EventEmitter {
  headers = {};
  resume = vi.fn();
  statusCode = 200;
}
class MockSocket extends EventEmitter {
  connecting = true;
  encrypted = true;
  getCipher = () => ({name: 'TLS_AES_256_GCM_SHA384'});
}
class MockOutgoing extends EventEmitter {
  destroy = vi.fn();
  end = vi.fn();
  reusedSocket = false;
  socket: MockSocket | undefined;
}

const fixture = () => {
  const response = new MockResponse();
  const outgoing = new MockOutgoing();
  const socket = new MockSocket();
  let respond: ((response: IncomingMessage) => void) | undefined;
  const binding = vi.fn((_url, _options, callback) => {
    respond = callback;
    return outgoing;
  });
  const options = {connectTimeout: 8000, idleTimeout: 12000, maxBytes: 1024, payload: Buffer.alloc(0),
    requestImplementation: binding as unknown as typeof request};
  const headers = () => respond!(response as unknown as IncomingMessage);
  return {binding, headers, options, outgoing, response, socket};
};

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

test('connect deadline bounds DNS/TCP/TLS while preserving independent socket idle policy', async () => {
  const f = fixture();
  const pending = httpsBytesRequest('https://fixture.invalid', f.options);
  const rejected = pending.catch((error: unknown) => error);
  f.outgoing.emit('socket', f.socket);
  await vi.advanceTimersByTimeAsync(7999);

  expect(f.outgoing.destroy).not.toHaveBeenCalled();

  f.socket.connecting = false;
  f.socket.emit('connect');
  await vi.advanceTimersByTimeAsync(1);

  expect(await rejected).toMatchObject({kind: 'connect-timeout'});

  expect(f.outgoing.destroy).toHaveBeenCalledOnce();
  expect(f.binding.mock.calls[0][1]).toMatchObject({timeout: 12000});
  expect(f.socket.listenerCount('secureConnect')).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

test('secure connect clears only connect deadline and idle timeout still interrupts an incomplete body', async () => {
  const f = fixture();
  const pending = httpsBytesRequest('https://fixture.invalid', f.options);
  const rejected = pending.catch((error: unknown) => error);
  f.outgoing.emit('socket', f.socket);
  f.socket.emit('secureConnect');
  await vi.advanceTimersByTimeAsync(100000);

  expect(f.outgoing.destroy).not.toHaveBeenCalled();

  f.headers();
  f.outgoing.emit('timeout');

  expect(await rejected).toMatchObject({kind: 'timeout'});

  expect(f.outgoing.destroy).toHaveBeenCalledOnce();
});

test.each([false, true])('connect timeout supports disabled or reused TLS phase (reused=%s)', async (reused) => {
  const f = fixture();
  f.outgoing.reusedSocket = reused;
  f.socket.connecting = !reused;
  const pending = httpsBytesRequest('https://fixture.invalid', {...f.options, connectTimeout: reused ? 8000 : 0});
  f.outgoing.emit('socket', f.socket);
  await vi.advanceTimersByTimeAsync(100000);

  expect(f.outgoing.destroy).not.toHaveBeenCalled();

  f.headers();
  f.response.emit('end');

  expect(await pending).toEqual(Buffer.alloc(0));
  expect(vi.getTimerCount()).toBe(0);
});

test('preaborted signal issues zero requests and preserves the caller reason', async () => {
  const f = fixture();
  const reason = {kind: 'original-stage-deadline'};

  await expect(httpsBytesRequest('https://fixture.invalid', {...f.options, signal: AbortSignal.abort(reason)})).rejects.toBe(reason);
  expect(f.binding).not.toHaveBeenCalled();
});

test('abort after dispatch cancels request with exact reason and clears phase timer/listeners', async () => {
  const f = fixture();
  const controller = new AbortController();
  const reason = new Error('Original owner cancellation');
  const pending = httpsBytesRequest('https://fixture.invalid', {...f.options, signal: controller.signal});
  const rejected = pending.catch((error: unknown) => error);
  f.outgoing.emit('socket', f.socket);
  controller.abort(reason);

  expect(await rejected).toBe(reason);

  expect(f.outgoing.destroy).toHaveBeenCalledExactlyOnceWith(reason);
  expect(f.socket.listenerCount('secureConnect')).toBe(0);
  expect(vi.getTimerCount()).toBe(0);
});

test('rejected body remains cancelable until drain while original domain failure stays stable', async () => {
  const f = fixture();
  const controller = new AbortController();
  const failure = new Error('Domain status refusal');
  const pending = httpsBytesRequest('https://fixture.invalid', {...f.options,
    inspectResponse: () => {
      throw failure;
    }, signal: controller.signal});
  f.headers();

  await expect(pending).rejects.toBe(failure);

  const reason = new Error('Outer stage deadline');
  controller.abort(reason);

  expect(f.outgoing.destroy).toHaveBeenCalledExactlyOnceWith(reason);
  await expect(pending).rejects.toBe(failure);
});

test.each([-1, NaN, Infinity, 0.5])('invalid connect timeout %s refuses before transport', async (connectTimeout) => {
  const f = fixture();

  await expect(httpsBytesRequest('https://fixture.invalid', {...f.options, connectTimeout})).rejects.toBeInstanceOf(RangeError);
  expect(f.binding).not.toHaveBeenCalled();
});

test('connection deadlines above the platform timer maximum rearm and expire without overflow', async () => {
  const f = fixture();
  const pending = httpsBytesRequest('https://fixture.invalid', {...f.options, connectTimeout: 2147483648});
  const rejected = pending.catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(2147483647);

  expect(f.outgoing.destroy).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(1);

  await vi.advanceTimersByTimeAsync(1);

  expect(await rejected).toMatchObject({kind: 'connect-timeout'});

  expect(vi.getTimerCount()).toBe(0);

  f.outgoing.emit('error', new Error('late socket failure'));
  f.outgoing.emit('timeout');

  expect(f.outgoing.destroy).toHaveBeenCalledOnce();
});

test('an already attached reused TLS socket needs no new handshake event', async () => {
  const f = fixture();
  const socket = new MockSocket();
  socket.connecting = false;
  f.outgoing.socket = socket;
  f.outgoing.reusedSocket = true;
  const pending = httpsBytesRequest('https://fixture.invalid', f.options);
  await vi.advanceTimersByTimeAsync(8001);

  expect(f.outgoing.destroy).not.toHaveBeenCalled();

  f.headers();
  f.response.emit('end');
  await pending;

  expect(vi.getTimerCount()).toBe(0);
});

test('an injected plain connecting socket ends its phase on connect', async () => {
  const f = fixture();
  const socket = new MockSocket();
  socket.encrypted = false;
  const pending = httpsBytesRequest('https://fixture.invalid', f.options);
  f.outgoing.emit('socket', socket);
  socket.emit('connect');
  await vi.advanceTimersByTimeAsync(8001);

  expect(f.outgoing.destroy).not.toHaveBeenCalled();

  f.headers();
  f.response.emit('end');
  await pending;
});

test('abort during the injected request constructor preserves non-Error reason without leaking its phase timer', async () => {
  const f = fixture();
  const controller = new AbortController();
  const reason = {kind: 'construction-abort'};
  const implementation = ((...args: Parameters<typeof f.binding>) => {
    controller.abort(reason);
    return f.binding(...args);
  }) as unknown as typeof request;

  await expect(httpsBytesRequest('https://fixture.invalid', {...f.options, requestImplementation: implementation,
    signal: controller.signal})).rejects.toBe(reason);
  expect(f.outgoing.destroy).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

test('body drain removes the caller abort listener so later cancellation does not destroy a completed response', async () => {
  const f = fixture();
  const controller = new AbortController();
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  const pending = httpsBytesRequest('https://fixture.invalid', {...f.options, signal: controller.signal});
  f.headers();
  f.response.emit('end');
  await pending;
  controller.abort(new Error('late cancellation'));

  expect(f.outgoing.destroy).not.toHaveBeenCalled();
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});

test('a phase already elapsed during request construction does not write its payload after cancellation', async () => {
  const f = fixture();
  const implementation = ((...args: Parameters<typeof f.binding>) => {
    vi.advanceTimersByTime(8000);
    return f.binding(...args);
  }) as unknown as typeof request;

  await expect(httpsBytesRequest('https://fixture.invalid', {...f.options,
    requestImplementation: implementation})).rejects.toMatchObject({kind: 'connect-timeout'});
  expect(f.outgoing.end).not.toHaveBeenCalled();
  expect(f.outgoing.destroy).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

test('TCP completion and cipher negotiation alone do not replace the secureConnect event', async () => {
  const f = fixture();
  const socket = new MockSocket();
  socket.connecting = false;
  const pending = httpsBytesRequest('https://fixture.invalid', f.options);
  const rejected = pending.catch((error: unknown) => error);
  f.outgoing.emit('socket', socket);
  socket.emit('connect');
  await vi.advanceTimersByTimeAsync(8000);

  expect(await rejected).toMatchObject({kind: 'connect-timeout'});

  expect(f.outgoing.destroy).toHaveBeenCalledOnce();
});


test('synchronous request end failure preserves the exact error and releases connect and abort resources', async () => {
  const f = fixture();
  const controller = new AbortController();
  const reason = new Error('injected synchronous end failure');
  const remove = vi.spyOn(controller.signal, 'removeEventListener');
  f.outgoing.end.mockImplementation(() => {
    f.outgoing.emit('socket', f.socket);
    throw reason;
  });

  await expect(httpsBytesRequest('https://fixture.invalid', {...f.options, signal: controller.signal})).rejects.toBe(reason);

  expect(f.outgoing.destroy).toHaveBeenCalledExactlyOnceWith(reason);
  expect(f.socket.listenerCount('secureConnect')).toBe(0);
  expect(f.outgoing.listenerCount('socket')).toBe(0);
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);

  controller.abort(new Error('later caller abort'));
  await vi.advanceTimersByTimeAsync(16000);

  expect(f.binding).toHaveBeenCalledOnce();
  expect(f.outgoing.end).toHaveBeenCalledOnce();
  expect(f.outgoing.destroy).toHaveBeenCalledOnce();
});
