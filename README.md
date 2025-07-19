# Rip Hunter: HTTP Client for REST & GraphQL**

> **Rip Hunter: Your Universal Gateway to Modern API Endpoints with Unmatched Speed and Reliability**

[![npm version](https://img.shields.io/npm/v/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/rip-hunter)
[![npm downloads](https://img.shields.io/npm/dm/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/rip-hunter)
[![Issues](http://img.shields.io/github/issues/nitrogenlabs/rip-hunter.svg?style=flat-square)](https://github.com/nitrogenlabs/rip-hunter/issues)
[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Chat](https://img.shields.io/discord/446122412715802649.svg)](https://discord.gg/Ttgev58)

**rip-hunter** is the all-in-one HTTP utility for developers who want a seamless, ESM-first way to connect to REST and GraphQL APIs. Whether you're building in Node.js, the browser, or serverless, rip-hunter makes data fetching, mutations, and error handling effortless—so you can focus on building features, not plumbing.

---

## 🚀 Why rip-hunter?

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

---

## 📦 Installation

```bash
npm install @nlabs/rip-hunter
# or
yarn add @nlabs/rip-hunter

# For Node.js SSE support (optional)
npm install eventsource
```

---

## ⚡ Quick Start

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

## 🛠️ API Reference

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

## 💡 Advanced Usage

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

## 🚀 Performance Features

- **Request Deduplication**: Prevents duplicate requests to the same endpoint
- **Built-in Caching**: Automatic caching for GET requests with 5-minute TTL
- **Timeout Support**: Configurable request timeouts (default: 30s)
- **Optimized Functions**: Lightweight utility functions for better performance
- **Memory Efficient**: Minimal object creation and garbage collection
- **SSE Reconnection**: Automatic retry with exponential backoff for SSE connections

---

## 🌐 Environment Support

- **Browser**: Full support for all features including SSE
- **Node.js**: Full REST/GraphQL support, SSE requires `eventsource` package
- **Serverless**: REST/GraphQL support (SSE not recommended in serverless)

---

## 🤝 Contributing

PRs and issues welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © Nitrogen Labs, Inc.

## 🔗 Links

- [GitHub](https://github.com/nitrogenlabs/rip-hunter)
- [NPM](https://www.npmjs.com/package/rip-hunter)
