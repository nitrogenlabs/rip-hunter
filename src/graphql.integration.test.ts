import {createServer} from 'node:http';
import {afterEach, expect, test} from 'vitest';

import {graphqlRequest} from './graphql.js';

import type {Server} from 'node:http';

let server: Server | undefined;

afterEach(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    if(!server) {
      resolve();
      return;
    }
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
});

const listen = async (handler: Parameters<typeof createServer>[1]): Promise<string> => {
  server = createServer(handler);
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if(!address || typeof address === 'string') {
    throw new Error('Server did not bind TCP.');
  }
  return `http://127.0.0.1:${address.port}/graphql`;
};

test('sends a real JSON POST with variables and explicit credentials', async () => {
  const endpoint = await listen(async (request, response) => {
    let body = '';
    for await (const chunk of request) {
      body += chunk.toString();
    }
    response.end(JSON.stringify({data: {
      authorization: request.headers.authorization, contentType: request.headers['content-type'],
      method: request.method, operation: JSON.parse(body)
    }}));
  });

  expect(await graphqlRequest(endpoint, {query: 'query { viewer { id } }', variables: {id: 'maya'}}, {token: 'session'}))
    .toEqual({authorization: 'Bearer session', contentType: 'application/json', method: 'POST',
      operation: {query: 'query { viewer { id } }', variables: {id: 'maya'}}});
});

test('cancels the real HTTP stream when its deadline expires', async () => {
  let disconnected!: () => void;
  const closed = new Promise<void>((resolve) => {
    disconnected = resolve;
  });
  let started!: () => void;
  const receiving = new Promise<void>((resolve) => {
    started = resolve;
  });
  const endpoint = await listen((_request, response) => {
    response.on('close', disconnected);
    response.write('{"data":');
    started();
  });
  const result = graphqlRequest(endpoint, {query: '{viewer}'}, {timeout: 500});
  const rejected = result.catch((error: unknown) => error);
  await receiving;

  expect(await rejected).toMatchObject({kind: 'timeout'});

  await closed;
});
