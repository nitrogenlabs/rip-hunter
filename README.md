![RipHunter](https://nitrogenlabs.com/logos/gh-rip-hunter.png "RipHunter")

#### JS utilities for GraphQL

RipHunter is a small utility to parse objects formatted for GraphQL requests. It will also use fetch to send query and 
mutation requests, returning a promise. Some helpers include sending an authorization token as well as custom headers.

[![npm version](https://img.shields.io/npm/v/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/rip-hunter)
[![Travis](https://img.shields.io/travis/nitrogenlabs/rip-hunter.svg?style=flat-square)](https://travis-ci.org/nitrogenlabs/rip-hunter)
[![npm downloads](https://img.shields.io/npm/dm/rip-hunter.svg?style=flat-square)](https://www.npmjs.com/package/rip-hunter)
[![Issues](http://img.shields.io/github/issues/nitrogenlabs/rip-hunter.svg?style=flat-square)](https://github.com/nitrogenlabs/rip-hunter/issues)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](http://opensource.org/licenses/MIT)

### Installation

Using [npm](https://www.npmjs.com/):

    $ npm install rip-hunter

###App Usage
Then with a module bundler like [webpack](https://webpack.github.io/) that supports either CommonJS or ES2015 modules, use as you would anything else:

```js
// Using an ES6 transpiler for web apps
import {Hunter} from 'rip-hunter';

// not using an ES6 transpiler
var Hunter = require('rip-hunter').Hunter;
```

### How to use

**Example:**
```js
import {Hunter} from 'rip-hunter';

const AppActions = {
  getData: () => {
    // Variables
    const url = 'http://www.example.com/graphql';
    const gql = '{ app { ping } }';
    
    // Query data
    return Hunter.query(url, gql)
      .then(results => {
        console.log(results.toJS());
        // Assuming the results will return the JSON object, {status: 'ok'}
        // Output: {status: 'ok'}
      })
      .catch(error => {
        // APIError will be returned if any problems occur.
      });
  },

  updateData: () => {
    // Variables
    const url = 'http://www.example.com/graphql';
    const data = {hello: 'world'};
    const gql = `{ user { update(data: ${Hunter.toGQL(data)}) } }`;
    
    // Mutate data
    return Hunter.mutation(url, gql)
      .then(results => {
        console.log(results.toJS());
        // Assuming the results will return the JSON object, {id: 'test', hello: 'world'}
        // Output: {id: 'test', hello: 'world'}
      })
      .catch(error => {
        // APIError will be returned if any problems occur.
      });
  }
}

```

## API

### Formatting

#### `toGQL(data)`
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


### Requests

#### `query(url, body, token, headers)`
Queries a GraphQL server.
* [`url`] \(*String*): GraphQL server endpoint. Must be an absolute url.
* [`body`] \(*String*): GraphQL query.
* [`token`] \(*String*): (optional) Will add an _Authorization_ header with the value _Bearer [token]_.
* [`headers`] \(*Object*): (optional) Will overwrite the default headers.

##### Returns
A promise with either the response data or error. Data will be returned as an immutable object.

#### `mutation(url, body, token, headers)`
Modifies data on a GraphQL server.
* [`url`] \(*String*): GraphQL server endpoint. Must be an absolute url.
* [`body`] \(*String*): GraphQL query.
* [`token`] \(*String*): (optional) Will add an _Authorization_ header with the value _Bearer [token]_.
* [`headers`] \(*Object*): (optional) Will overwrite the default headers.

##### Returns
A promise with either the response data or error. Data will be returned as an immutable object.
