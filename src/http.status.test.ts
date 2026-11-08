import {afterEach, beforeEach, expect, it, vi} from '@nlabs/lex/test-vitest';

import {ApiError} from './errors/ApiError.js';
import {assertHttpSuccess, HttpRequestError, httpRequest, type RequestImplementation, startHttpRequest} from './http.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', () => {
    throw new Error('Unexpected outbound request');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('public status handling leaves a successful JSON response for the consumer', async () => {
  const request = vi.fn<RequestImplementation>(async () => new Response('{"ok":true}', {headers: {'Content-Type': 'application/json'}}));
  const value = await httpRequest('https://fixture.invalid', {requestImplementation: request, timeout: 100}, async (response) => {
    await assertHttpSuccess(response, {});
    return response.json();
  });

  expect(value).toEqual({ok: true});
  expect(request).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([307, 401, 402, 409, 429, 503])('retains public ApiError status and parsed problem JSON for %i', async (status) => {
  const request = vi.fn<RequestImplementation>(async () => new Response('{"error":{"code":"synthetic"}}', {
    headers: {'Content-Type': 'application/problem+json'}, status
  }));
  const pending = httpRequest('https://fixture.invalid', {redirect: 'manual', requestImplementation: request, timeout: 100},
    async (response) => {
      await assertHttpSuccess(response, {});
      return response.json();
    });

  await expect(pending).rejects.toBeInstanceOf(ApiError);
  await expect(pending).rejects.toMatchObject({errors: ['http_error'], responseBody: {error: {code: 'synthetic'}}, status});
  expect(request).toHaveBeenCalledOnce();
  expect(request.mock.calls[0][1]?.redirect).toBe('manual');
  expect(vi.getTimerCount()).toBe(0);
});

it('an explicit legacy status policy leaves the error body consumable', async () => {
  const response = new Response('{"error":"legacy"}', {headers: {'Content-Type': 'application/json'}, status: 400});
  await assertHttpSuccess(response, {throwHttpErrors: false});

  expect(await response.json()).toEqual({error: 'legacy'});
});

it('error-body reading remains inside the absolute request deadline and aborts the transport', async () => {
  expect(assertHttpSuccess).toBeTypeOf('function');

  let enter!: () => void;
  let finish!: (value: string) => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const held = new Promise<string>((resolve) => {
    finish = resolve;
  });
  const response = new Response('synthetic', {status: 503});
  const text = vi.spyOn(response, 'text').mockImplementation(() => {
    enter();
    return held;
  });
  const request = vi.fn(async (_input: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) => response);
  const operation = startHttpRequest('https://fixture.invalid', {requestImplementation: request, timeout: 100}, async (reply) => {
    await assertHttpSuccess(reply, {});
  });
  const rejected = expect(operation.result).rejects.toMatchObject({kind: 'timeout'});
  await entered;

  expect(text).toHaveBeenCalledOnce();
  expect(request.mock.calls[0][1]?.signal?.aborted).toBe(false);

  await vi.advanceTimersByTimeAsync(100);
  await rejected;

  expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  await expect(operation.result).rejects.toBeInstanceOf(HttpRequestError);

  finish('synthetic');
  await operation.settled;

  expect(vi.getTimerCount()).toBe(0);
});
