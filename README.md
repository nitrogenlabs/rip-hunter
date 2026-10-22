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

## Entry points

| Import | Purpose | Runtime |
| --- | --- | --- |
| `@nlabs/rip-hunter` | REST helpers, legacy GraphQL helpers, SSE and subscriptions; also exports strict `graphqlRequest` | Platform fetch; streaming features require platform support |
| `@nlabs/rip-hunter/http` | Fetch lifecycle, caller-owned decoding and bounded binary reads | Node, browser, React Native with fetch APIs |
| `@nlabs/rip-hunter/graphql` | Strict JSON GraphQL operations and typed errors without subscription code | Node, browser, React Native with fetch APIs |
| `@nlabs/rip-hunter/http2` | Reusable certificate-authenticated HTTP/2 client | Node only |
| `@nlabs/rip-hunter/node-https` | Bounded HTTPS byte transport with socket inactivity timeout | Node only |
| `@nlabs/rip-hunter/deadline` | Cancellable absolute deadline scheduler | Runtime with `performance.now` and timers |
| `@nlabs/rip-hunter/errors` or `@nlabs/rip-hunter/errors/ApiError` | Legacy `ApiError` class | All supported runtimes |

Use the dedicated entry points for lean transports. HTTP, HTTP/2, Node HTTPS and deadline helpers are imported from their subpaths.

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

// Mutation with an inline GraphQL input
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
- **options**: `{ credentials?, headers?, token?, timeout?, cache?, throwHttpErrors? }`
- **Returns**: `Promise<any>`

#### `get(url, params?, options?)`

HTTP GET request.

- **url**: `string`
- **params**: `object`
- **options**: `{ credentials?, headers?, token?, timeout?, cache?, throwHttpErrors? }`
- **Returns**: `Promise<any>`

#### `post(url, params?, options?)`

HTTP POST request.

- **url**: `string`
- **params**: `object`
- **options**: `{ credentials?, headers?, token?, timeout?, throwHttpErrors? }`
- **Returns**: `Promise<any>`

#### `put(url, params?, options?)`

HTTP PUT request.

- **url**: `string`
- **params**: `object`
- **options**: `{ credentials?, headers?, token?, timeout?, throwHttpErrors? }`
- **Returns**: `Promise<any>`

#### `del(url, params?, options?)`

HTTP DELETE request.

- **url**: `string`
- **params**: `object`
- **options**: `{ credentials?, headers?, token?, timeout?, throwHttpErrors? }`
- **Returns**: `Promise<any>`

---

### GraphQL Functions

#### `query(url, body, options?)`

Send a GraphQL query.

- **url**: `string` – GraphQL endpoint
- **body**: `string` – GraphQL query string
- **options**: `{ credentials?, headers?, token?, timeout?, throwHttpErrors? }`
- **Returns**: `Promise<any>`

#### `mutation(url, body, options?)`

Send a GraphQL mutation.

- **url**: `string`
- **body**: `string`
- **options**: `{ credentials?, headers?, token?, timeout?, throwHttpErrors? }`
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
- **options**: `{ credentials?, headers?, token?, timeout?, throwHttpErrors? }`
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

### Error Handling

#### `ApiError`

The root REST and legacy GraphQL helpers use `ApiError` for HTTP and request failures. Legacy timeout races reject with a plain `Error`. Dedicated transports use the error classes documented below.

- **.errors**: `string[]` – List of error messages
- **.source**: `Error` – Original error object
- **.status**: `number | undefined` – HTTP failure status
- **.responseBody**: `unknown` – Parsed JSON or response text when available

---

## Advanced Usage

### Credentials and legacy request options

Root REST helpers and `graphqlQuery` (including `query` and `mutation`) accept
`credentials: 'include' | 'omit' | 'same-origin'`. Omitting it preserves the
platform fetch default. Bearer tokens and JSON encoding still work with explicit
credential modes. GET cache identity includes the credential mode, headers and
other request options.

```js
import {get, graphqlQuery} from '@nlabs/rip-hunter';

const profile = await get('/api/profile', undefined, {credentials: 'include'});
const viewer = await graphqlQuery('/graphql', {
  query: 'query Viewer($id: ID!) { user(id: $id) { name } }',
  variables: {id: '123'}
}, {credentials: 'same-origin', timeout: 5000});
```

Legacy helpers default to a 30,000 ms timeout; zero or negative values disable
the timeout race. That race rejects the returned promise without aborting the
underlying fetch. Use the lean HTTP or strict GraphQL entry for cancellation
covering request and body consumption. Legacy helpers take `Headers` objects
and may update them when adding authentication or JSON headers.

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

`graphqlQuery` accepts variables in the operation object. The `query` and `mutation` wrappers only send their document string; use `graphqlQuery` or strict `graphqlRequest` when supplying variables.

```js
import { graphqlQuery } from '@nlabs/rip-hunter';
const document = `
  query GetUser($id: ID!) {
    user(id: $id) { name email }
  }
`;

const variables = { id: '123' };
const user = await graphqlQuery('/graphql', { query: document, variables });
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

- **Request Deduplication**: Opt-in `cache: true` shares GET promises for matching URL, parameters and options, including credentials and headers
- **Built-in Caching**: Opt-in GET caching with a 5-minute TTL; rejected requests are evicted
- **Timeout Support**: Configurable request timeouts (default: 30s)
- **Optimized Functions**: Lightweight utility functions for better performance
- **Memory Efficient**: Minimal object creation and garbage collection
- **SSE Reconnection**: Retries closed SSE connections at the configured fixed `retryInterval`

---

## Environment Support

- **Browser**: Full support for all features including SSE
- **Node.js**: Full REST/GraphQL support, SSE requires `eventsource` package
- **Serverless**: REST/GraphQL support (SSE not recommended in serverless)

---

## HTTP failures

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
`headers: Exclude<RequestInit['headers'], undefined>`, `requestImplementation: typeof fetch`, `signal`, `timeout`
and `token`. Header inputs are cloned. A nonempty token overrides
Authorization; otherwise caller headers remain intact. JSON parsing does not
require a response Content-Type header.

Nonempty provider errors reject partial data; missing data rejects, while explicit
null/falsy data is returned unchanged. The generic result type describes `data`; it does not perform runtime schema validation.
`GraphQLRequestError` exposes `kind`, provider
`errors`, HTTP `status`, `responseBody` and the original `cause`. Failure kinds are
`http`, `graphql`, `missing_data`, `invalid_response`, `network`, `abort` and `timeout`.
Apps retain endpoint policy, displayed error copy, session ownership and domain validation.
The operation argument requires `query` and accepts optional `variables` and
`operationName`. The options argument defaults to `{}`:

| Option | Default | Behavior |
| --- | --- | --- |
| `headers` | Fresh headers | Platform header input, cloned before use; JSON Content-Type added only if absent |
| `readHttpErrorBody` | `true` | Retain error-body diagnostics; `false` rejects on HTTP status immediately |
| `requestImplementation` | Platform fetch | Inject a compatible fetch implementation |
| `signal` | None | Caller cancellation; original reason retained as error cause |
| `timeout` | `0` | Positive finite milliseconds across request and body; use zero to disable |
| `token` | None | Nonempty value sets Bearer Authorization |

 Interrupted successful response bodies
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

```ts
import {readFileSync} from 'node:fs';
import {createHttp2Client} from '@nlabs/rip-hunter/http2';

const client = createHttp2Client({
  origin: 'https://api.example.com',
  tls: {
    ca: readFileSync('ca.pem'),
    cert: readFileSync('client-cert.pem'),
    key: readFileSync('client-key.pem')
  }
});
try {
  const response = await client.request('/records', {
    body: JSON.stringify({name: 'Rip'}),
    headers: {'content-type': 'application/json'},
    maxResponseBytes: 65_536,
    method: 'POST',
    timeout: 5000
  });
  if(response.status !== 200) throw new Error(`HTTP ${response.status}`);
  const record = JSON.parse(response.body);
} finally {
  client.close();
}
```

Paths must start with `/` and cannot start with `//`. Request bodies are strings;
response `body` is decoded as UTF-8. The cap counts bytes before decoding.
Timeout, oversize and interrupted responses reject with plain `Error` objects.
This transport uses a platform timer per stream; zero does not disable its
timeout, and it does not use the bounded absolute scheduler described below.

## Lean HTTP request lifecycle

`@nlabs/rip-hunter/http` exports `httpRequest(url, options, consumeResponse)`, `HttpRequestError`, `readBinaryResponse` and `BinaryResponseError`. It works with platform fetch or an injected `requestImplementation`, clones caller headers, and forwards RequestInit credentials/cache/redirect/method settings unchanged. Raw `body` and `json` are mutually exclusive, including explicit undefined raw body keys; JSON adds Content-Type only when absent. Parsing, accepted statuses, redirects, provider error data and retries remain caller-owned. No sessions, cache ingestion or retry is introduced.

Caller signal and finite nonnegative `timeout` cover fetch AND the response consumer. `timeout: 0` or an omitted timeout has no deadline. Large finite deadlines use bounded platform timer intervals and monotonic elapsed time so timer overflow cannot expire them early. Cancellation aborts the injected request and rejects even when it ignores the signal; pre-aborted requests are not invoked, and late responses are not consumed. HttpRequestError kind is abort/timeout; other network/domain errors propagate unchanged. Timers/listeners clean up on every settled path.

`readBinaryResponse(response,maxBytes)` reads Uint8Array bytes without text conversion, enforces a nonnegative safe-integer cap against actual streamed bytes regardless of Content-Length, cancels oversize bodies and releases stream locks. Failed stream cancellation does not replace a known cap error; interrupted reads reject without returning a prefix. Use inside the HTTP callback so the deadline spans the bytes. Socket-idle Node HTTPS semantics are a separate capability and must not be replaced silently by this absolute deadline.

```ts
import {httpRequest, readBinaryResponse} from '@nlabs/rip-hunter/http';

const bytes = await httpRequest('https://api.example.com/export', {
  credentials: 'include',
  method: 'GET',
  timeout: 10_000
}, response => {
  if(!response.ok) throw new Error(`HTTP ${response.status}`);
  return readBinaryResponse(response, 1_048_576);
});

const record = await httpRequest('https://api.example.com/records', {
  json: {name: 'Rip'},
  method: 'POST'
}, response => response.json());
```

`HttpRequestOptions` supports platform `RequestInit` fields plus `json`,
`requestImplementation`, `signal` and `timeout`. Supply `body` for FormData,
binary or other platform body values. Supply authentication through `headers`;
this API has no `token` option. The consumer callback may return a value or a
promise, and its result determines the return type. HTTP statuses do not reject
automatically. Invalid timeout or conflicting raw/JSON payloads reject with
`TypeError`. Caller aborts expose the original reason as `HttpRequestError.cause`.
Oversize reads reject with `BinaryResponseError` (`kind: 'limit'`); invalid caps
reject with `TypeError`. An absent response body returns an empty byte array.

### Node HTTPS bytes and socket inactivity

`httpsBytesRequest` from `@nlabs/rip-hunter/node-https` sends a Uint8Array once, preserves response bytes, and limits actual received bytes. Options include immutable headers, method, maxBytes, injectable Node request binding and an inspectResponse callback for application status policy. `idleTimeout` is forwarded to Node HTTPS socket inactivity; it is **not** an absolute request deadline. Errors expose timeout, limit or interrupted kinds; request/body errors and domain callback errors retain identity. No redirects or retries. This Node-only entry point is separate from browser/native HTTP and GraphQL imports.

```ts
import {httpsBytesRequest} from '@nlabs/rip-hunter/node-https';

const bytes = await httpsBytesRequest('https://api.example.com/export', {
  headers: {'Content-Type': 'application/json'},
  idleTimeout: 5000,
  inspectResponse: response => {
    if(response.statusCode !== 200) throw new Error(`HTTP ${response.statusCode}`);
  },
  maxBytes: 1_048_576,
  method: 'POST',
  payload: new TextEncoder().encode(JSON.stringify({format: 'binary'}))
});
```

Returns `Promise<Buffer>`. Both `payload` and `maxBytes` are required. The byte
cap is a nonnegative safe integer, including zero. `idleTimeout` defaults to
zero (disabled) and accepts integers from zero through 2,147,483,647 ms. Invalid
limits reject with `RangeError`. An omitted method uses Node's GET default.
`inspectResponse` is synchronous and runs before consuming bytes; a rejected
response is drained. `requestImplementation` accepts the Node HTTPS `request`
binding for injection. `HttpsBytesError` exposes `kind: 'timeout' | 'limit' |
'interrupted'`; it is exported from the same subpath.

### Public absolute deadline scheduler

`@nlabs/rip-hunter/deadline` exports `scheduleDeadline(timeoutMs, expire)`. Supply a finite positive duration; cancellation returns a function that clears the pending timer. Scheduling measures monotonic elapsed time and splits durations above the platform timer limit into bounded intervals. The callback runs once when the absolute budget elapses. This generic scheduler does not own request retries, mutation semantics or caller error classification. The package manifest exposes this subpath; consumers need an installed release that includes it.

```ts
import {scheduleDeadline} from '@nlabs/rip-hunter/deadline';

const controller = new AbortController();
const cancelDeadline = scheduleDeadline(60_000, () => controller.abort());
// When the caller-owned operation finishes:
cancelDeadline();
```

The returned cancellation function is safe to call repeatedly. Callers must
validate the finite positive duration before scheduling; this primitive does
not validate it or provide a zero-disable policy. HTTP and GraphQL apply their
own timeout policies around the scheduler.

### Platform types for lean HTTP and GraphQL entries

The public `@nlabs/rip-hunter/http` and `@nlabs/rip-hunter/graphql` entries use the platform's public `RequestInit` body/header contracts. Node projects need their supported Node fetch types; browser projects use DOM types; React Native projects use their installed React Native public types. No DOM library is required for Node or React Native consumers. Optional raw bodies and headers exclude explicit `undefined` under `exactOptionalPropertyTypes`; omit the property instead. Raw bodies may be `null`, and raw `body` and `json` remain mutually exclusive. Streaming body support follows the platform's own `RequestInit` contract.

### Original HTTP operation settlement (source candidate)

The additive `startHttpRequest<T>(url, options, consumeResponse)` export at `/http` returns a frozen `{result, settled, cancel}` handle. `httpRequest` remains the Promise-returning compatibility wrapper over the same core. `result` bounds request and consumer publication; caller cancellation/deadline still rejects it promptly even when an injected implementation ignores AbortSignal. `cancel(reason?)` is idempotent, preserves the first abort reason and affects only this operation. Cancel after terminal publication is a no-op. Zero/omitted timeout still disables the deadline; positive finite durations include synchronous setup, serialization and consumer/publication checks against monotonic elapsed time as well as the shared bounded scheduler.

`settled` independently joins the actual original request, the consumer's returned promise and owned cancellation of an unused late response body. Original request/consumer errors complete that join without changing their existing `result` error identity. Locked or failed late-body cleanup rejects `settled` with the fixed message `HTTP request cleanup not proven.` and no raw cause; this rejection remains observable and is internally handled for legacy result-only callers. Noncooperative original work or cleanup may leave `settled` pending indefinitely. Bounded result rejection is never a fabricated original-closure acknowledgement. No remote mutation rollback, socket/process closure, retry or status/redirect policy is implied.

The consumer must await every body read/cancellation it initiates for its returned promise to provide full-body settlement. Detached work cannot be inferred or joined by this API. Returning a successful Response/stream intentionally hands ownership to the caller: it is not automatically consumed or cancelled, and `settled` does not claim that handed-off body is closed. Existing network/domain error identity remains unchanged; it is not safe to journal arbitrary errors or caller abort causes. A synchronous domain throw wins over a delayed deadline callback even if the clock advanced during that throw; elapsed-time checks fence success publication, not rewrite already-thrown domain errors. No credentials, URLs, response bodies or raw provider causes are added to the settlement error.

This operation is an unpublished source candidate until an independently reviewed compatible release is verified. Package version/publication/adoption are separate gates.

---

## Contributing

PRs and issues welcome through the [GitHub repository](https://github.com/nitrogenlabs/rip-hunter).

## License

MIT © Nitrogen Labs, Inc.

## 🔗 Links

- [GitHub](https://github.com/nitrogenlabs/rip-hunter)
- [NPM](https://www.npmjs.com/package/@nlabs/rip-hunter)
