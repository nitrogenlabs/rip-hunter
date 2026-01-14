# Rip Hunter: AI Coding Guidelines

## Project Overview
Rip Hunter is an ESM-first TypeScript HTTP client library supporting REST APIs, GraphQL queries/mutations/subscriptions, and Server-Sent Events (SSE). Key features include request caching, deduplication, timeouts, and automatic reconnection for real-time features.

## Architecture
- **Core Exports**: `get`, `post`, `put`, `del`, `ajax` for REST; `query`, `mutation`, `subscribe` for GraphQL; `subscribeSSE` for SSE
- **Error Handling**: Use `ApiError` class from `./errors/ApiError.js` - extends Error with `source` and `errors` array
- **Request Deduplication**: Automatic via `requestCache` Map using base64-encoded keys from method/URL/params/options
- **Caching**: GET requests cached by default when `cache: true` in options
- **Real-time**: GraphQL subscriptions use WebSocket with `graphql-ws` protocol; SSE uses EventSource (install `eventsource` for Node.js)

## Development Workflow
- **Build**: `npm run build` (lex compile --remove) outputs to `lib/` with .d.ts declarations
- **Test**: `npm run test` (lex test) uses Jest with @nlabs/fetch-mock; reset mocks in beforeEach/afterEach
- **Lint**: `npm run lint` (lex lint --fix) enforces code style
- **Benchmark**: `npm run benchmark` tests utility function performance

## Code Patterns
- **Imports**: Use ESM imports with `.js` extensions (e.g., `import { get } from './index.js'`)
- **TypeScript**: Interfaces prefixed with `Hunter*Type` (e.g., `HunterOptionsType`)
- **Utilities**: `toGql()` converts objects to GraphQL literals; `queryString()` encodes URL params; `removeSpaces()` cleans GraphQL strings
- **Options**: Pass `token` for auth, `timeout` in ms, `variables` for GraphQL, `headers` as Headers object
- **GraphQL Variables**: Use `variables` object; convert to GQL with `toGql(input)` in mutations
- **Subscriptions**: Return unsubscribe function; handle `onNext`, `onError`, `onComplete`, `onReconnect`

## Examples
```typescript
// REST with caching
const data = await get(url, params, { cache: true, token: 'jwt' });

// GraphQL query
const result = await query(url, '{ user { id name } }', { timeout: 10000 });

// Subscription
const unsubscribe = subscribe(wsUrl, 'subscription { userUpdated { id name } }', {
  onNext: data => console.log(data.userUpdated)
}, { token: 'jwt', maxReconnectAttempts: 10 });
```

## Key Files
- `src/index.ts`: Main implementation with all exports
- `src/errors/ApiError.ts`: Custom error class
- `src/index.test.ts`: Comprehensive Jest tests with fetch mocking
- `package.json`: ESM exports for main and errors subpaths</content>
<parameter name="filePath">/Users/nitrog7/Development/rip-hunter/.github/copilot-instructions.md