import {expect, test} from '@nlabs/lex/test-playwright';
import {createServer} from 'node:http';

import {httpRequest, readBinaryResponse} from './http.js';

import type {AddressInfo} from 'node:net';

test.describe('real local HTTP lifecycle', () => {
  const bytes = new Uint8Array([0, 255, 128, 13, 10, 192, 0]);
  const server = createServer((request, response) => {
    const path = request.url?.split('?')[0];
    if(path === '/headers-hang') {
      return;
    }
    if(path === '/body-hang') {
      response.writeHead(200);
      response.flushHeaders();
      return;
    }
    if(path === '/interrupted') {
      response.writeHead(200, {'Content-Length': '100'});
      response.write(bytes);
      setTimeout(() => response.destroy(), 15);
      return;
    }
    if(path === '/redirect') {
      response.writeHead(302, {Location: '/bytes'});
      response.end();
      return;
    }
    if(path === '/degraded') {
      response.writeHead(503, {'Content-Type': 'text/plain'});
      response.end('{"degraded":true}');
      return;
    }
    response.writeHead(200, {'Content-Type': 'application/octet-stream'});
    response.write(bytes.subarray(0, 2));
    response.end(bytes.subarray(2));
  });
  let endpoint: string;

  test.beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  test.afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('returns exact non-UTF8 bytes through platform fetch and shared reader', async () => {
    expect(await httpRequest(`${endpoint}/bytes?retain=encoded%20value`, {}, (response) => readBinaryResponse(response, 7))).toEqual(bytes);
  });

  test('keeps degraded JSON and metadata domain-owned despite Content-Type', async () => {
    expect(await httpRequest(`${endpoint}/degraded`, {}, async (response) => ({body: await response.json(), ok: response.ok, status: response.status, url: response.url}))).toEqual({body: {degraded: true}, ok: false, status: 503, url: `${endpoint}/degraded`});
  });

  test('lets adapter reject final redirect before consuming bytes', async () => {
    const error = new Error('redirect policy');
    let consumed = 0;
    const consumeBytes = (response: Response) => {
      consumed++;
      return readBinaryResponse(response, 7);
    };

    await expect(httpRequest(`${endpoint}/redirect`, {}, (response) => {
      if(response.url !== `${endpoint}/redirect`) {
        throw error;
      }
      return consumeBytes(response);
    })).rejects.toBe(error);
    expect(consumed).toBe(0);
  });

  const assertDeadline = async (path: string): Promise<void> => {
    await expect(httpRequest(`${endpoint}${path}`, {timeout: 50}, (response) => readBinaryResponse(response, 100)))
      .rejects.toMatchObject({kind: 'timeout'});
  };
  for(const path of ['/headers-hang', '/body-hang']) {
    test(`aborts actual ${path} request under deadline`, () => assertDeadline(path));
  }

  test('rejects interrupted binary rather than returning a successful prefix', async () => {
    await expect(httpRequest(`${endpoint}/interrupted`, {timeout: 500}, (response) => readBinaryResponse(response, 100))).rejects.toBeInstanceOf(TypeError);
  });
});
