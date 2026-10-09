# Rip Hunter: HTTP Client for REST & GraphQL

> **Rip Hunter: Your Universal Gateway to Modern API Endpoints with Unmatched Speed and Reliability**

[![npm version](https://img.shields.io/npm/v/@nlabs/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/@nlabs/rip-hunter)
[![npm downloads](https://img.shields.io/npm/dm/@nlabs/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/@nlabs/rip-hunter)
[![Issues](http://img.shields.io/github/issues/nitrogenlabs/rip-hunter.svg?style=flat-square)](https://github.com/nitrogenlabs/rip-hunter/issues)
[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Chat](https://img.shields.io/discord/446122412715802649.svg)](https://discord.gg/Ttgev58)

**rip-hunter** is the all-in-one HTTP utility for developers who want a seamless, ESM-first way to connect to REST and GraphQL APIs. Whether you're building in Node.js, the browser, or serverless, rip-hunter makes data fetching, mutations, and error handling effortless—so you can focus on building features, not plumbing.

---

## Why rip-hunter?

- **Unified API**: One package for both REST and GraphQL endpoints
- **ESM & TypeScript Native**: Modern, type-safe, and tree-shakable
- **Works Everywhere**: Node, browser, serverless—no config needed
- **Built-in Auth & Headers**: Effortlessly add tokens and custom headers
- **Automatic Error Handling**: Consistent, developer-friendly errors
- **Tiny & Fast**: Minimal dependencies, zero bloat
- **Request Caching**: Built-in caching for GET requests
- **Timeout Support**: Configurable request timeouts
- **Request Deduplication**: Prevents duplicate requests
- **Real-time Updates**: Server-Sent Events (SSE) support
- **GraphQL Subscriptions**: WebSocket-based subscriptions with automatic reconnection

---

## Installation

```bash
npm install @nlabs/rip-hunter
# or
yarn add @nlabs/rip-hunter

# For Node.js SSE support (optional)
npm install eventsource
```

---

## Quick Start

### REST Example

```js
import { get, post } from '@nlabs/rip-hunter';

const url = 'https://api.example.com/data';

// GET request with caching
const data = await get(url, { userId: 123 }, { cache: true });

// POST request with auth token and timeout
const result = await post(url, { name: 'Rip Hunter' }, {
  token: 'your_jwt_token',
  timeout: 5000
});
```

### GraphQL Example

```js
import { query, mutation, toGql } from '@nlabs/rip-hunter';

const url = 'https://api.example.com/graphql';
const gql = '{ user { id name } }';

// Query with timeout
const userData = await query(url, gql, { timeout: 10000 });

// Mutation with variables
const input = { name: 'Rip Hunter' };
const mutationGql = `mutation { createUser(input: ${toGql(input)}) { id name } }`;
const created = await mutation(url, mutationGql, { timeout: 5000 });
```

### GraphQL Subscription Example

```js
import { subscribe } from '@nlabs/rip-hunter';

// Subscribe to real-time GraphQL updates
const unsubscribe = subscribe(
  'wss://api.example.com/graphql',
  `
    subscription {
      userUpdated {
        id
        name
        email
      }
    }
  `,
  {
    onNext: (data) => {
      console.log('User updated:', data.userUpdated);
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    },
    onComplete: () => {
      console.log('Subscription completed');
    },
    onReconnect: (attempt) => {
      console.log(`Reconnecting... (attempt ${attempt})`);
    }
  },
  {
    token: 'your_jwt_token',
    variables: { userId: '123' },
    connectionParams: { clientId: 'my-client' },
    maxReconnectAttempts: 10,
    reconnectInterval: 1000
  }
);

// Later, to unsubscribe:
unsubscribe();
```

### SSE Example

```js
import { subscribeSSE } from '@nlabs/rip-hunter';

// Subscribe to real-time updates
const unsubscribe = subscribeSSE('https://api.example.com/stream', {
  onMessage: (event) => {
    console.log('Received:', event.data);
  },
  onError: (error) => {
    console.error('SSE Error:', error);
  },
  onOpen: () => {
    console.log('SSE connection opened');
  }
}, {
  token: 'your_jwt_token',
  timeout: 30000,
  retryInterval: 1000,
  maxRetries: 5
});

// Later, to stop listening:
unsubscribe();
```

---

## API Reference

### REST Functions

#### `ajax(url, method, params?, options?)`

Low-level HTTP request for any method.

- **url**: `string` – Absolute URL
- **method**: `string` – HTTP method (GET, POST, etc.)
- **params**: `object` – Data to send (query for GET, body for others)
- **options**: `{ headers?, token?, timeout?, cache? }`
- **Returns**: `Promise<any>`

#### `get(url, params?, options?)`

HTTP GET request.

- **url**: `string`
- **params**: `object`
- **options**: `{ headers?, token?, timeout?, cache? }`
- **Returns**: `Promise<any>`

#### `post(url, params?, options?)`

HTTP POST request.

- **url**: `string`
- **params**: `object`
- **options**: `{ headers?, token?, timeout? }`
- **Returns**: `Promise<any>`

#### `put(url, params?, options?)`

HTTP PUT request.

- **url**: `string`
- **params**: `object`
- **options**: `{ headers?, token?, timeout? }`
- **Returns**: `Promise<any>`

#### `del(url, params?, options?)`

HTTP DELETE request.

- **url**: `string`
- **params**: `object`
- **options**: `{ headers?, token?, timeout? }`
- **Returns**: `Promise<any>`

---

### GraphQL Functions

#### `query(url, body, options?)`

Send a GraphQL query.

- **url**: `string` – GraphQL endpoint
- **body**: `string` – GraphQL query string
- **options**: `{ headers?, token?, variables?, stripWhitespace?, timeout? }`
- **Returns**: `Promise<any>`

#### `mutation(url, body, options?)`

Send a GraphQL mutation.

- **url**: `string`
- **body**: `string`
- **options**: `{ headers?, token?, variables?, stripWhitespace?, timeout? }`
- **Returns**: `Promise<any>`

#### `subscribe(url, query, callbacks, options?)`

Subscribe to a GraphQL subscription over WebSocket (graphql-ws protocol).

- **url**: `string` – WebSocket URL (ws:// or wss://)
- **query**: `string` – GraphQL subscription query string
- **callbacks**: `HunterSubscriptionCallbackType` – Event handlers
  - `onNext?: (data: any) => void` – Called when new data arrives
  - `onError?: (error: Error | Event) => void` – Called on errors
  - `onComplete?: () => void` – Called when subscription completes
  - `onReconnect?: (attempt: number) => void` – Called during reconnection attempts
- **options**: `HunterSubscriptionOptionsType`
  - `token?: string` – Authentication token
  - `variables?: Record<string, unknown>` – GraphQL variables
  - `connectionParams?: Record<string, unknown>` – WebSocket connection parameters
  - `maxReconnectAttempts?: number` – Maximum reconnection attempts (default: 5)
  - `reconnectInterval?: number` – Delay between reconnection attempts in ms (default: 1000)
  - `timeout?: number` – Connection timeout
  - `headers?: Headers` – Custom headers
- **Returns**: `() => void` – Unsubscribe function

#### `graphqlQuery(url, query, options?)`

Low-level GraphQL request.

- **url**: `string` – GraphQL endpoint
- **query**: `HunterQueryType | HunterQueryType[]` – Query object(s)
- **options**: `{ headers?, token?, timeout? }`
- **Returns**: `Promise<any>`

#### `toGql(data)`

Convert JS objects, arrays, or primitives to GraphQL input strings.

- **data**: `any`
- **Returns**: `string`
- **Example**:

  ```js
  toGql({ name: 'Rip', age: 42 }) // => '{name: "Rip", age: 42}'
  ```

---

### SSE Functions

#### `subscribeSSE(url, callbacks, options?)`

Subscribe to Server-Sent Events.

- **url**: `string` – SSE endpoint URL
- **callbacks**: `HunterSSECallbackType` – Event handlers
  - `onMessage?: (event: HunterSSEEventType) => void`
  - `onOpen?: (event: Event) => void`
  - `onError?: (error: Error | Event) => void`
  - `onRetry?: (attempt: number, delay: number) => void`
- **options**: `HunterSSEOptionsType` – Connection options
  - `headers?: Headers`
  - `token?: string`
  - `timeout?: number` (default: 30000)
  - `retryInterval?: number` (default: 1000)
  - `maxRetries?: number` (default: 5)
- **Returns**: `() => void` – Cleanup function

#### `HunterSSEEventType`

SSE event object with:

- `data: string` – Event data
- `type: string` – Event type
- `id?: string` – Event ID
- `retry?: number` – Retry interval (if specified by server)

---

### Events & Error Handling

#### `on(eventType, listener)`

Subscribe to events (e.g., error events).

- **eventType**: `string` (e.g., 'rip_hunter_error')
- **listener**: `Function`

#### `off(eventType, listener)`

Unsubscribe from events.

#### `ApiError`

All errors are wrapped in a consistent `ApiError` object for easy handling.

- **.errors**: `string[]` – List of error messages
- **.source**: `Error` – Original error object

---

## Advanced Usage

### Request Caching

```js
// Cache GET requests for 5 minutes
const data = await get('/api/users', {}, { cache: true });
```

### Timeout Handling

```js
// Set 10 second timeout
const result = await post('/api/data', payload, { timeout: 10000 });
```

### Custom Headers

```js
const headers = new Headers({
  'X-Custom-Header': 'value',
  'Content-Type': 'application/json'
});

const data = await get('/api/data', {}, { headers });
```

### GraphQL Variables

```js
const query = `
  query GetUser($id: ID!) {
    user(id: $id) { name email }
  }
`;

const variables = { id: '123' };
const user = await query('/graphql', query, { variables });
```

### SSE with Authentication

```js
const headers = new Headers({
  'Authorization': 'Bearer your-token',
  'Accept': 'text/event-stream'
});

const unsubscribe = subscribeSSE('/api/notifications', {
  onMessage: (event) => {
    const notification = JSON.parse(event.data);
    console.log('New notification:', notification);
  },
  onError: (error) => {
    console.error('SSE error:', error);
  }
}, {
  headers,
  timeout: 60000,
  maxRetries: 10
});
```

---

## Performance Features

- **Request Deduplication**: Prevents duplicate requests to the same endpoint
- **Built-in Caching**: Automatic caching for GET requests with 5-minute TTL
- **Timeout Support**: Configurable request timeouts (default: 30s)
- **Optimized Functions**: Lightweight utility functions for better performance
- **Memory Efficient**: Minimal object creation and garbage collection
- **SSE Reconnection**: Automatic retry with exponential backoff for SSE connections

---

## Environment Support

- **Browser**: Full support for all features including SSE
- **Node.js**: Full REST/GraphQL support, SSE requires `eventsource` package
- **Serverless**: REST/GraphQL support (SSE not recommended in serverless)

---

## Contributing

PRs and issues welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © Nitrogen Labs, Inc.

## 🔗 Links

- [GitHub](https://github.com/nitrogenlabs/rip-hunter)
- [NPM](https://www.npmjs.com/package/rip-hunter)

### HTTP failures

REST helpers and `graphqlQuery` reject non-2xx responses with `ApiError`.
`error.status` contains the HTTP status, `error.responseBody` contains the
parsed JSON or response text, and `error.errors` contains `http_error`.
An HTTP error is not relabeled as a network error. Failed GET requests are
removed from the deduplication cache so a retry can reach the server.

Earlier releases resolved REST error responses as normal results. Callers
that intentionally inspect those bodies can temporarily pass
`{throwHttpErrors: false}`; otherwise handle the rejected `ApiError` and
inspect its `responseBody`. HTTP success alone does not prove an application
operation succeeded—continue validating the expected response fields.

## Strict GraphQL requests

Use `@nlabs/rip-hunter/graphql` for JSON GraphQL operations with caller-owned
credentials and an optional fetch implementation (including React Native):

```ts
import {graphqlRequest} from '@nlabs/rip-hunter/graphql';

const data = await graphqlRequest<{viewer: {id: string}}>(endpoint, {
  query: 'query Viewer { viewer { id } }',
  variables: {}
}, {signal, timeout: 15_000, token});
```

The lean entry point does not load SSE or WebSocket code. Options support
`headers: HeadersInit`, `requestImplementation: typeof fetch`, `signal`, `timeout`
and `token`. Header inputs are cloned. An explicitly supplied token overrides
Authorization; otherwise caller headers remain intact. JSON parsing does not
require a response Content-Type header.

Nonempty provider errors reject partial data; missing data rejects, while explicit
null/falsy data is returned unchanged. `GraphQLRequestError` exposes `kind`, provider
`errors`, HTTP `status`, `responseBody` and the original `cause`. Failure kinds are
`http`, `graphql`, `missing_data`, `invalid_response`, `network`, `abort` and `timeout`.
Apps retain endpoint policy, displayed error copy, session ownership and domain validation.
Operations accept optional `operationName`. Interrupted successful response bodies
reject as `invalid_response` with the original cause and HTTP status.
Set `readHttpErrorBody: false` to classify non-success HTTP status immediately,
without awaiting or decoding an error body; the default preserves error-body diagnostics.

Timeouts are disabled by default. A positive timeout or upstream abort cancels the
request through its AbortSignal, including response body reading; custom fetch
implementations must honor that signal to release their resources. Request timers
and upstream listeners are removed after completion. There are no automatic retries,
caching or store updates. Existing `graphqlQuery`, `query`, `mutation` and REST APIs
keep their established behavior.

## Certificate HTTP/2 transport (Node only)

Import `createHttp2Client` from `@nlabs/rip-hunter/http2`. Pass an HTTPS `origin`
and Node TLS `tls` options (including `secureContext`, or PEM `cert`, `key`, and
optional `ca`). Certificate and hostname verification remain enabled.
`request(path, {method, headers, body, timeout, maxResponseBytes})` returns
`{status, headers, body}` without interpreting HTTP error bodies. Defaults are
GET, a 30-second deadline, and a 64-KiB response limit. Call `close()` after the
requests complete. Streams are cancelled on timeout or response overflow.
Connections are reused; requests are not automatically replayed after failures.
This entry point adds no Node imports to browser entry points.

## Lean HTTP request lifecycle

`@nlabs/rip-hunter/http` exports `httpRequest(url, options, consumeResponse)`, `HttpRequestError`, `readBinaryResponse` and `BinaryResponseError`. It works with platform fetch or an injected `requestImplementation`, clones caller headers, and forwards RequestInit credentials/cache/redirect/method settings unchanged. Raw `body` and `json` are mutually exclusive, including explicit undefined raw body keys; JSON adds Content-Type only when absent. Parsing, accepted statuses, redirects, provider error data and retries remain caller-owned. No sessions, cache ingestion or retry is introduced.

Caller signal and finite nonnegative `timeout` cover fetch AND the response consumer. Timeout0/omitted has no deadline. Large finite deadlines use bounded platform timer intervals and monotonic elapsed time so timer overflow cannot expire them early. Cancellation aborts the injected request and rejects even when it ignores the signal; pre-aborted requests are not invoked, and late responses are not consumed. HttpRequestError kind is abort/timeout; other network/domain errors propagate unchanged. Timers/listeners clean up on every settled path.

`readBinaryResponse(response,maxBytes)` reads Uint8Array bytes without text conversion, enforces a nonnegative safe-integer cap against actual streamed bytes regardless of Content-Length, cancels oversize bodies and releases stream locks. Failed stream cancellation does not replace a known cap error; interrupted reads reject without returning a prefix. Use inside the HTTP callback so the deadline spans the bytes. Socket-idle Node HTTPS semantics are a separate capability and must not be replaced silently by this absolute deadline.

### Node HTTPS bytes and socket inactivity

`httpsBytesRequest` from `@nlabs/rip-hunter/node-https` sends a Uint8Array once, preserves response bytes, and limits actual received bytes. Options include immutable headers, method, maxBytes, injectable Node request binding and an inspectResponse callback for application status policy. `idleTimeout` is forwarded to Node HTTPS socket inactivity; it is **not** an absolute request deadline. Errors expose timeout, limit or interrupted kinds; request/body errors and domain callback errors retain identity. No redirects or retries. This Node-only entry point is separate from browser/native HTTP and GraphQL imports.

### Public absolute deadline scheduler

`@nlabs/rip-hunter/deadline` exports `scheduleDeadline(timeoutMs, expire)`. Supply a finite positive duration; cancellation returns a function that clears the pending timer. Scheduling measures monotonic elapsed time and splits durations above the platform timer limit into bounded intervals. The callback runs once when the absolute budget elapses. This generic scheduler does not own request retries, mutation semantics or caller error classification. The additive export is unpublished until a verified release or exact local artifact is adopted.
