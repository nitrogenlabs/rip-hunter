import {readFileSync} from 'node:fs';
import {createSecureServer} from 'node:http2';
import {afterEach, describe, expect, it} from 'vitest';
import {createHttp2Client} from './http2.js';

const cert = readFileSync(new URL('./test-fixtures/cert.pem', import.meta.url));
const key = readFileSync(new URL('./test-fixtures/key.pem', import.meta.url));
const cleanups: (() => void)[] = [];
afterEach(() => {for(const cleanup of cleanups.splice(0)) cleanup();});
const serverFor = async (handler: Parameters<typeof createSecureServer>[1]) => {
  const server = createSecureServer({ca: cert, cert, key, rejectUnauthorized: true, requestCert: true}, handler);
  server.on('session', (session) => cleanups.push(() => session.destroy()));
  await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
  cleanups.push(() => server.close());
  const address = server.address();
  if(!address || typeof address === 'string') throw new Error('Missing test server address');
  return `https://localhost:${address.port}`;
};
const clientFor = (origin: string, tls = {ca: cert, cert, key}) => {
  const client = createHttp2Client({origin, tls});
  cleanups.push(() => client.close());
  return client;
};

describe('certificate HTTP/2 transport', () => {
  it('sends JSON over mutually authenticated TLS and retains status and response body', async () => {
    const origin = await serverFor((request, response) => {
      let body = '';
      request.on('data', (chunk) => {body += chunk;});
      request.on('end', () => {
        response.writeHead(400, {'content-type': 'application/json'});
        response.end(JSON.stringify({body: JSON.parse(body), method: request.method, path: request.url}));
      });
    });
    const result = await clientFor(origin).request('/device/one', {body: '{"message":"Hello"}', method: 'POST'});
    expect(result.status).toBe(400);
    expect(JSON.parse(result.body)).toEqual({body: {message: 'Hello'}, method: 'POST', path: '/device/one'});
  });

  it('reuses a connection and prevents new requests after close', async () => {
    const origin = await serverFor((_request, response) => response.end('ok'));
    const client = clientFor(origin);
    expect((await client.request('/one')).body).toBe('ok');
    expect((await client.request('/two')).body).toBe('ok');
    client.close();
    expect(() => client.request('/three')).toThrow(/closed/);
    createHttp2Client({origin}).close();
  });

  it('rejects an untrusted server certificate', async () => {
    const origin = await serverFor((_request, response) => response.end());
    await expect(clientFor(origin, {ca: undefined, cert, key}).request('/')).rejects.toThrow();
  });

  it('bounds a stalled request and cancels its stream', async () => {
    const origin = await serverFor(() => undefined);
    await expect(clientFor(origin).request('/', {timeout: 30})).rejects.toThrow(/timeout/i);
  });

  it('rejects oversized responses', async () => {
    const origin = await serverFor((_request, response) => response.end('response too big'));
    await expect(clientFor(origin).request('/', {maxResponseBytes: 4})).rejects.toThrow(/limit/i);
  });

  it('rejects a reset stream instead of accepting an incomplete response', async () => {
    const origin = await serverFor((_request, response) => response.stream.close(8));
    await expect(clientFor(origin).request('/')).rejects.toThrow();
  });

  it('requires HTTPS and prevents a request from changing authority', () => {
    expect(() => clientFor('http://localhost')).toThrow(/HTTPS/);
    expect(() => clientFor('https://localhost').request('https://other.test')).toThrow(/path/);
  });
});
