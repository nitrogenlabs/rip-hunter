# Public platform HTTP type regression fixtures

These compile-only fixtures import ordinary public `/http` and `/graphql` exports. Run with strict checking, `exactOptionalPropertyTypes: true`, and `skipLibCheck: false`. Node uses only ES2023 and actual `@types/node`; browser adds DOM/DOM.Iterable with no Node types; native uses ES2023 and the consumer's installed public React Native type entry with no DOM or Node types. No custom globals, private framework names, source aliases, or runner dependencies are needed.

`contract.ts` is paired with `node.ts`, `browser.ts`, or `native.ts`. The native fixture requires React Native in the qualification consumer, not as a production Rip-Hunter dependency. These fixtures are compile-only and must not run their synthetic requests.

The candidate contract additionally imports public `startHttpRequest` and `HttpRequestOperation`, checks synchronous/asynchronous callback inference, original `Promise<void>` settlement, cancel reasons and readonly handle fields. These fixtures are compile-only and must not execute their synthetic requests. Local tsconfig.node.json and tsconfig.browser.json use the actual package self-export declarations. Native qualification requires a consumer with an installed public React Native type entry and does not introduce a production dependency, custom platform globals or source alias.
