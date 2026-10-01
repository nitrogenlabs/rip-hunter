import {afterEach, expect, it, vi} from 'vitest';
import {ajax, graphqlQuery, post} from './index.js';
import {ApiError} from './errors/ApiError.js';
afterEach(() => vi.unstubAllGlobals());
it('rejects JSON 409/503 responses with status and parsed body', async () => {
  for(const status of [409, 503]) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({error: 'write_failed'}), {headers: {'Content-Type': 'application/json'}, status})));
    await expect(post('https://example.test', {}, {timeout: 0})).rejects.toMatchObject({errors: ['http_error'], responseBody: {error: 'write_failed'}, status});
  }
});
it('preserves HTTP status for text, empty and malformed JSON errors', async () => {
  for(const [body, contentType, expected] of [['Bad gateway', 'text/plain', 'Bad gateway'], ['', 'application/json', ''], ['<html>Failure</html>', 'application/json', '<html>Failure</html>']]) {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body, {headers: {'Content-Type': contentType}, status: 502})));
    await expect(ajax('https://example.test', 'GET', undefined, {timeout: 0})).rejects.toMatchObject({responseBody: expected, status: 502});
  }
});
it('rejects GraphQL HTTP failures before interpreting the GraphQL payload', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"unauthorized"}', {headers: {'Content-Type': 'application/json'}, status: 401})));
  await expect(graphqlQuery('https://example.test', {query: '{viewer{id}}'}, {timeout: 0})).rejects.toMatchObject({errors: ['http_error'], status: 401});
});
it('does not cache rejected GETs and retries the server on the next request', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(new Response('Unavailable', {status: 503})).mockResolvedValueOnce(new Response('{"ok":true}', {headers: {'Content-Type': 'application/json'}})); vi.stubGlobal('fetch', fetch);
  await expect(ajax('https://retry.example.test', 'GET', undefined, {cache: true, timeout: 0})).rejects.toBeInstanceOf(ApiError);
  expect(await ajax('https://retry.example.test', 'GET', undefined, {cache: true, timeout: 0})).toEqual({ok: true}); expect(fetch).toHaveBeenCalledTimes(2);
});
it('preserves successful JSON/text and explicit legacy response handling', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"legacy"}', {headers: {'Content-Type': 'application/json'}, status: 400})));
  expect(await post('https://legacy.example.test', {}, {throwHttpErrors: false, timeout: 0})).toEqual({error: 'legacy'});
});
it('parses application/problem+json errors and retains status if the body cannot be read', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"detail":"Conflict"}', {headers: {'Content-Type': 'application/problem+json'}, status: 409})));
  await expect(post('https://problem.example.test', {}, {timeout: 0})).rejects.toMatchObject({responseBody: {detail: 'Conflict'}, status: 409});
  const response = new Response('body', {status: 503}); await response.text(); vi.stubGlobal('fetch', vi.fn(async () => response));
  await expect(post('https://consumed.example.test', {}, {timeout: 0})).rejects.toMatchObject({errors: ['http_error'], status: 503});
});
it('preserves the legacy ApiError constructor and optional response metadata', () => {
  const cause = new Error('network'); const error = new ApiError(undefined as never, cause);
  expect(error.errors).toEqual([]); expect(error.status).toBeUndefined(); expect(error.source).toBe(cause);
});
it('never reuses a legacy error response for a strict request with caching', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"conflict"}', {headers: {'Content-Type': 'application/json'}, status: 409})));
  const url = 'https://policy.example.test/same-url';
  await ajax(url, 'GET', undefined, {cache: true, timeout: 0, throwHttpErrors: false});
  await expect(ajax(url, 'GET', undefined, {cache: true, timeout: 0, throwHttpErrors: true})).rejects.toMatchObject({status: 409});
});
