![rip-hunter](https://nitrogenlabs.com/logos/gh-rip-hunter.png "rip-hunter")

#### JS utilities for GraphQL

rip-hunter is a small utility to parse objects formatted for GraphQL requests as well as use fetch to send query and
mutation requests, returning a promise. Some helpers include sending an authorization token as well as custom headers.

[![npm version](https://img.shields.io/npm/v/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/rip-hunter)
[![Travis](https://img.shields.io/travis/nitrogenlabs/rip-hunter.svg?style=flat-square)](https://travis-ci.org/nitrogenlabs/rip-hunter)
[![npm downloads](https://img.shields.io/npm/dm/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/rip-hunter)
[![Issues](http://img.shields.io/github/issues/nitrogenlabs/rip-hunter.svg?style=flat-square)](https://github.com/nitrogenlabs/rip-hunter/issues)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](http://opensource.org/licenses/MIT)

### Installation

Using [npm](https://www.npmjs.com/):

    $ npm install @nlabs/rip-hunter

###App Usage
Then with a module bundler like [webpack](https://webpack.github.io/) that supports either CommonJS or ES2015 modules, use as you would anything else:

```js
import {query} from '@nlabs/rip-hunter';
```

### How to use

**Example:**

```js
import {mutation, query, toGql} from '@nlabs/rip-hunter';

const AppActions = {
  getData: () => {
    // Variables
    const url = 'http://www.example.com/graphql';
    const gql = '{ app { ping } }';

    // Query data
    return query(url, gql)
      .then(results => {
        console.log(results);
        // Assuming the results will return the JSON object, {status: 'ok'}
        // Output: {status: 'ok'}
      })
      .catch(error => {
        // ApiError will be returned if any problems occur.
      });
  },

  updateData: () => {
    // Variables
    const url = 'http://www.example.com/graphql';
    const data = {hello: 'world'};
    const gql = `{ user { update(data: ${toGql(data)}) } }`;

    // Mutate data
    return mutation(url, gql)
      .then(results => {
        console.log(results);
        // Assuming the results will return the JSON object, {id: 'test', hello: 'world'}
        // Output: {id: 'test', hello: 'world'}
      })
      .catch(error => {
        // ApiError will be returned if any problems occur.
      });
  }
}

```

## API

### Formatting

#### `toGql(data)`

Parses an immutable object, JSON object, string, or number into a GraphQL formatted string. This string is used when
sending variables in a request.

* [`data`] \(* Any *): An immutable object, JSON object, string or number to format for use with a GQL request.

##### Returns

A string formatted for use with GQL.


### Events

#### `on(eventType, data)`

Adds an event listener. The only event emitted is when an error occurs. The error event is _rip_hunter_error_.

* [`eventType`] \(*String*): Event to subscribe for store updates.
* [`listener`] \(*Function*): The callback to be invoked any time an action has been dispatched.

#### `off(eventType, data)`

Removes an event listener.

* [`eventType`] \(*String*): Event to unsubscribe.
* [`listener`] \(*Function*): The callback associated with the subscribed event.


### AJAX

#### `ajax(url, method, params, options)`

AJAX request.

* [`url`] \(*String*): URL to send the request. Must be an absolute url.
* [`method`] \(*String*): The HTTP method for the request.
* [`params`] \(*Object*): Data to be sent with the request. Params will be converted to a query string for GET methods.
* [`options`] \(*Object*): Rip Hunter options.
  * [`headers`] \(*Object*): Overwrite the default headers.
  * [`token`] \(*String*): Add an _Authorization_ header with the value _Bearer [token]_.

##### Returns

A promise with either the response data or ApiError.

#### `get(url, params, options)`

Server request using HTTP GET.

* [`url`] \(*String*): URL to send the request. Must be an absolute url.
* [`params`] \(*Object*): Data to be sent with the request.
* [`options`] \(*Object*): Rip Hunter options.
  * [`headers`] \(*Object*): Overwrite the default headers.
  * [`token`] \(*String*): Add an _Authorization_ header with the value _Bearer [token]_.

##### Returns

A promise with either the response data or ApiError.

#### `post(url, params, options)`

Server request using HTTP POST.

* [`url`] \(*String*): URL to send the request. Must be an absolute url.
* [`params`] \(*Object*): Data to be sent with the request.
* [`options`] \(*Object*): Rip Hunter options.
  * [`headers`] \(*Object*): Overwrite the default headers.
  * [`token`] \(*String*): Add an _Authorization_ header with the value _Bearer [token]_.

##### Returns

A promise with either the response data or ApiError.

#### `put(url, params, options)`

Server request using HTTP PUT.

* [`url`] \(*String*): URL to send the request. Must be an absolute url.
* [`params`] \(*Object*): Data to be sent with the request.
* [`options`] \(*Object*): Rip Hunter options.
  * [`headers`] \(*Object*): Overwrite the default headers.
  * [`token`] \(*String*): Add an _Authorization_ header with the value _Bearer [token]_.

##### Returns

A promise with either the response data or ApiError.

#### `del(url, params, options)`

Server request using HTTP DEL.

* [`url`] \(*String*): GraphQL server endpoint. Must be an absolute url.
* [`params`] \(*Object*): Data to be sent with the request.
* [`options`] \(*Object*): Rip Hunter options.
  * [`headers`] \(*Object*): Overwrite the default headers.
  * [`token`] \(*String*): Add an _Authorization_ header with the value _Bearer [token]_.

##### Returns

A promise with either the response data or ApiError.

### GraphQL

#### `query(url, body, options)`

Queries a GraphQL server.

* [`url`] \(*String*): GraphQL server endpoint. Must be an absolute url.
* [`body`] \(*String*): GraphQL query.
* [`options`] \(*Object*): Rip Hunter options.
  * [`headers`] \(*Object*): Overwrite the default headers.
  * [`stripWhitespace`] \(*Boolean*): Removes whitespace in body. Default: false.
  * [`token`] \(*String*): Add an _Authorization_ header with the value _Bearer [token]_.
  * [`variables`] \(*Object*): Variables used in query. Default: {}.

##### Returns

A promise with either the response data or ApiError.

#### `mutation(url, body, token, headers)`

Modifies data on a GraphQL server.

* [`url`] \(*String*): GraphQL server endpoint. Must be an absolute url.
* [`body`] \(*String*): GraphQL query.
* [`options`] \(*Object*): Rip Hunter options.
  * [`headers`] \(*Object*): Overwrite the default headers.
  * [`stripWhitespace`] \(*Boolean*): Removes whitespace in body. Default: false.
  * [`token`] \(*String*): Add an _Authorization_ header with the value _Bearer [token]_.
  * [`variables`] \(*Object*): Variables used in query. Default: {}.

##### Returns

A promise with either the response data or ApiError.
