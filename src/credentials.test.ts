import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ajax, graphqlQuery} from './index.js';

const url = 'https://api.example.test/calendar';
const request = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  request.mockReset().mockImplementation(async () => new Response('{"ok":true}', {
    headers: {'Content-Type': 'application/json'}
  }));
  vi.stubGlobal('fetch', request);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('explicit Fetch credentials', () => {
  it.each(['include', 'omit', 'same-origin'] as const)('forwards %s without changing JSON or auth', async (credentials) => {
    await expect(ajax(url, 'POST', {resourceId: 'resource-1'}, {credentials, timeout: 0, token: 'test-token'}))
      .resolves.toEqual({ok: true});

    const [target, init] = request.mock.calls[0];

    expect(target).toBe(url);
    expect(init).toMatchObject({body: '{"resourceId":"resource-1"}', credentials, method: 'POST'});
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each(['include', 'omit', 'same-origin'] as const)('forwards GraphQL %s', async (credentials) => {
    request.mockImplementationOnce(async () => new Response('{"data":{"ok":true}}', {
      headers: {'Content-Type': 'application/json'}
    }));
    const query = {query: '{ currentSource { id } }'};

    await expect(graphqlQuery(url, query, {credentials, timeout: 0})).resolves.toEqual({ok: true});
    expect(request.mock.calls[0][1]).toMatchObject({body: JSON.stringify(query), credentials, method: 'post'});
  });

  it('leaves platform defaults omitted for REST and GraphQL', async () => {
    await ajax(url, 'GET', undefined, {timeout: 0});
    await graphqlQuery(url, {query: '{ id }'}, {timeout: 0});
    for(const [, init] of request.mock.calls) {
      expect(init).not.toHaveProperty('credentials');
    }
  });

  it('deduplicates only the same credential mode, including omitted defaults', async () => {
    const target = `${url}/cache-modes`;
    const pending = [];
    for(const credentials of [undefined, 'include', 'omit', 'same-origin'] as const) {
      const options = {cache: true, ...(credentials ? {credentials} : {}), timeout: 0};
      const first = ajax(target, 'GET', undefined, options);

      expect(ajax(target, 'GET', undefined, options)).toBe(first);

      pending.push(first);
    }

    await expect(Promise.all(pending)).resolves.toEqual(Array.from({length: 4}, () => ({ok: true})));
    expect(request).toHaveBeenCalledTimes(4);
    expect(request.mock.calls.map(([, init]) => init?.credentials)).toEqual([
      undefined, 'include', 'omit', 'same-origin'
    ]);
  });

  it('does not replay a rejected credentialed mutation', async () => {
    request.mockRejectedValueOnce(new Error('connection uncertain'));

    await expect(ajax(url, 'POST', {resourceId: 'resource-1'}, {credentials: 'include', timeout: 0}))
      .rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
