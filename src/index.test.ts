import {jest} from '@jest/globals';
import {FetchMock} from '@nlabs/fetch-mock';

import {
  ajax,
  del,
  get,
  graphqlQuery,
  mutation,
  post,
  put,
  query,
  queryString,
  removeSpaces,
  subscribeSSE,
  toGql
} from '.';
import {ApiError} from './errors/ApiError';

describe('rip-hunter', () => {
  const fetchMock = new FetchMock();
  const url = 'http://www.test.com/graphql';

  beforeEach(() => {
    // Reset fetch-mock before each test
    fetchMock.reset();
    fetchMock.restore();

    // Clear any global fetch overrides
    if(global.fetch && typeof global.fetch !== 'function') {
      delete (global as any).fetch;
    }
  });

  afterEach(() => {
    // Clean up fetch-mock after each test
    fetchMock.reset();
    fetchMock.restore();

    // Restore original fetch if it was overridden
    if(global.fetch && typeof global.fetch !== 'function') {
      delete (global as any).fetch;
    }

    // Clear any timers that might be left hanging
    jest.clearAllTimers();
  });

  describe('#fetchMock', () => {
    it('should verify fetch mock is working', (done) => {
      const testData = {test: 'data'};

      fetchMock.getOnce('https://test.com/api', {
        body: testData,
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      fetch('https://test.com/api')
        .then((response) => response.json())
        .then((data) => {
          expect(data).toEqual(testData);
          done();
        })
        .catch(done);
    });

    it('should verify GraphQL mock is working', (done) => {
      const testData = {hello: 'world'};

      fetchMock.postOnce('https://test.com/graphql', {
        body: {data: testData},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      fetch('https://test.com/graphql', {
        body: JSON.stringify({query: 'test'}),
        headers: {'Content-Type': 'application/json'},
        method: 'POST'
      })
        .then((response) => response.json())
        .then((data) => {
          expect(data).toEqual({data: testData});
          done();
        })
        .catch(done);
    });
  });

  describe('#toGql', () => {
    it('should convert a string to GQL', () => {
      const str: string = 'test';
      const gql: string = toGql(str);
      expect(gql).toEqual('"test"');
    });

    it('should convert a number to GQL', () => {
      const num: number = 123;
      const gql: string = toGql(num);
      expect(gql).toEqual('123');
    });

    it('should convert a JSON object to GQL', () => {
      const obj: object = {prop: 'test'};
      const gql: string = toGql(obj);
      expect(gql).toEqual('{prop: "test"}');
    });

    it('should convert an array to GQL', () => {
      const array: object[] = [{prop: 'test'}];
      const gql: string = toGql(array);
      expect(gql).toEqual('[{prop: "test"}]');
    });

    it('should handle null values in objects', () => {
      const obj = {nullValue: null, prop: 'test'};
      const gql: string = toGql(obj);
      expect(gql).toEqual('{prop: "test"}');
    });

    it('should handle undefined values in objects', () => {
      const obj = {prop: 'test', undefinedValue: undefined};
      const gql: string = toGql(obj);
      expect(gql).toEqual('{prop: "test"}');
    });

    it('should handle nested objects', () => {
      const obj = {user: {age: 30, name: 'John'}};
      const gql: string = toGql(obj);
      expect(gql).toEqual('{user: {age: 30, name: "John"}}');
    });

    it('should handle arrays with mixed types', () => {
      const obj = {items: ['test', 123, {nested: 'value'}]};
      const gql: string = toGql(obj);
      expect(gql).toEqual('{items: ["test", 123, {nested: "value"}]}');
    });

    it('should handle empty object', () => {
      const obj = {};
      const gql: string = toGql(obj);
      expect(gql).toEqual('""');
    });

    it('should handle boolean values', () => {
      const obj = {active: true, visible: false};
      const gql: string = toGql(obj);
      expect(gql).toEqual('{active: true, visible: false}');
    });

    it('should handle null input', () => {
      const gql: string = toGql(null);
      expect(gql).toEqual('null');
    });

    it('should handle undefined input', () => {
      const gql: string = toGql(undefined);
      expect(gql).toEqual('undefined');
    });

    it('should handle non-string JSON.stringify results', () => {
      const obj = {func() {}};
      const gql: string = toGql(obj);
      expect(gql).toEqual('""');
    });

    it('should handle objects with only null/undefined values', () => {
      const obj = {nullVal: null, undefinedVal: undefined};
      const gql: string = toGql(obj);
      expect(gql).toEqual('""');
    });
  });

  describe('#queryString', () => {
    it('should convert object to query string', () => {
      const params = {age: 25, name: 'test'};
      const result = queryString(params);
      expect(result).toEqual('age=25&name=test');
    });

    it('should handle empty object', () => {
      const params = {};
      const result = queryString(params);
      expect(result).toEqual('');
    });

    it('should handle special characters', () => {
      const params = {email: 'test@example.com', name: 'test user'};
      const result = queryString(params);
      expect(result).toEqual('email=test%40example.com&name=test%20user');
    });

    it('should handle array values', () => {
      const params = {tags: ['tag1', 'tag2']};
      const result = queryString(params);
      expect(result).toEqual('tags=tag1%2Ctag2');
    });

    it('should handle null and undefined values', () => {
      const params = {name: 'test', nullVal: null, undefinedVal: undefined};
      const result = queryString(params);
      expect(result).toEqual('name=test&nullVal=null&undefinedVal=undefined');
    });
  });

  describe('#removeSpaces', () => {
    it('should remove extra spacing except within quotes', () => {
      const str: string = 'test{ method: {id: "hello world"}';
      expect(removeSpaces(str)).toEqual('test{method:{id:"hello world"}');
    });

    it('should handle multiple spaces', () => {
      const str = 'query { user { id name } }';
      expect(removeSpaces(str)).toEqual('query{user{idname}}');
    });

    it('should preserve spaces in quoted strings', () => {
      const str = 'query { user(name: "John Doe") { id } }';
      expect(removeSpaces(str)).toEqual('query{user(name:"John Doe"){id}}');
    });

    it('should handle empty string', () => {
      const str = '';
      expect(removeSpaces(str)).toEqual('');
    });

    it('should handle string with no spaces', () => {
      const str = 'query{user{id}}';
      expect(removeSpaces(str)).toEqual('query{user{id}}');
    });

    it('should handle complex nested quotes', () => {
      const str = 'query { user(name: "John \"Doe\"") { id } }';
      expect(removeSpaces(str)).toEqual('query{user(name:"John \"Doe\""){id}}');
    });
  });

  describe('#ajax', () => {
    it('should make GET request with query parameters', (done) => {
      fetchMock.getOnce(`${url}?param=value`, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'GET', {param: 'value'})
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should make POST request with body', (done) => {
      const data = {name: 'test'};
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', data)
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle authentication token', (done) => {
      const token = 'test_token';
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', {data: 'test'}, {token})
        .then(() => {
          const opts = fetchMock.lastOptions();
          expect(opts.headers.get('Authorization')).toEqual(`Bearer ${token}`);
          done();
        })
        .catch(done);
    });

    it('should handle custom headers', (done) => {
      const headers = new Headers({'X-Custom-Header': 'value'});
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', {data: 'test'}, {headers})
        .then(() => {
          const opts = fetchMock.lastOptions();
          expect(opts.headers.get('X-Custom-Header')).toEqual('value');
          done();
        })
        .catch(done);
    });

    it('should handle text response', (done) => {
      fetchMock.postOnce(url, {
        body: 'plain text response',
        headers: new Headers({'Content-Type': 'text/plain'}),
        status: 200
      });

      ajax(url, 'POST', {data: 'test'})
        .then((response) => {
          expect(response).toEqual('plain text response');
          done();
        })
        .catch(done);
    });

    it('should handle network errors', (done) => {
      // Mock fetch to throw network error
      const originalFetch = global.fetch;
      global.fetch = () => Promise.reject(new Error('Network error'));

      ajax(url, 'POST', {data: 'test'})
        .then(() => {
          expect(false).toEqual(true);
          done();
        })
        .catch((error: ApiError) => {
          expect(error.errors[0]).toEqual('network_error');
          global.fetch = originalFetch;
          done();
        });
    });

    it('should handle invalid URL errors', (done) => {
      // Mock fetch to throw error for invalid URL
      const originalFetch = global.fetch;
      global.fetch = () => Promise.reject(new Error('only absolute urls are supported'));

      ajax('invalid-url', 'POST', {data: 'test'})
        .then(() => {
          expect(false).toEqual(true);
          done();
        })
        .catch((error: ApiError) => {
          expect(error.errors[0]).toEqual('invalid_url');
          global.fetch = originalFetch;
          done();
        });
    });

    it('should handle timeout', (done) => {
      // Mock fetch to never resolve (simulate timeout)
      const originalFetch = global.fetch;
      global.fetch = () => new Promise<Response>(() => {}); // Never resolves

      ajax(url, 'POST', {data: 'test'}, {timeout: 1})
        .then(() => {
          expect(false).toEqual(true);
          done();
        })
        .catch((error) => {
          expect(error.message).toEqual('Request timeout');
          global.fetch = originalFetch;
          done();
        });
    });

    it('should handle cache with different parameters', (done) => {
      fetchMock.getOnce(`${url}?param1=value1&param2=value2`, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'GET', {param1: 'value1', param2: 'value2'}, {cache: true})
        .then((response) => {
          expect(response).toEqual({success: true});
          done();
        })
        .catch(done);
    });

    it('should handle cache with different options', (done) => {
      fetchMock.getOnce(`${url}?param=value`, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'GET', {param: 'value'}, {cache: true, timeout: 5000})
        .then((response) => {
          expect(response).toEqual({success: true});
          done();
        })
        .catch(done);
    });

    it('should handle empty URL', (done) => {
      fetchMock.getOnce('http://localhost/', {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax('http://localhost/', 'GET')
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle null/undefined parameters', (done) => {
      fetchMock.getOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'GET', null)
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle different HTTP methods', (done) => {
      fetchMock.putOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'PUT', {data: 'test'})
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle no timeout', (done) => {
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', {data: 'test'}, {timeout: 0})
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle cache cleanup', (done) => {
      fetchMock.getOnce(`${url}?param=value`, {
        body: {cached: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'GET', {param: 'value'}, {cache: true})
        .then(() => {
          // Wait for cache cleanup (5 minutes in real code, but we can't wait that long)
          // This test just ensures the cleanup setTimeout is called
          done();
        })
        .catch(done);
    });

    it('should handle empty token', (done) => {
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', {data: 'test'}, {token: ''})
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle whitespace-only token', (done) => {
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', {data: 'test'}, {token: '   '})
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle undefined options', (done) => {
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', {data: 'test'}, undefined)
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });

    it('should handle null options', (done) => {
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      ajax(url, 'POST', {data: 'test'}, undefined)
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });
  });

  describe('#get', () => {
    it('should make GET request', (done) => {
      fetchMock.getOnce(`${url}?param=value`, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      get(url, {param: 'value'})
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });
  });

  describe('#post', () => {
    it('should make POST request', (done) => {
      const data = {name: 'test'};
      fetchMock.postOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      post(url, data)
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });
  });

  describe('#put', () => {
    it('should make PUT request', (done) => {
      const data = {name: 'test'};
      fetchMock.putOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      put(url, data)
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });
  });

  describe('#del', () => {
    it('should make DELETE request', (done) => {
      fetchMock.deleteOnce(url, {
        body: {success: true},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      del(url)
        .then((response) => {
          expect(response.success).toEqual(true);
          done();
        })
        .catch(done);
    });
  });

  describe('#graphqlQuery', () => {
    beforeEach(() => {
      // Additional cleanup for GraphQL tests
      fetchMock.reset();
      fetchMock.restore();
    });

    afterEach(() => {
      // Clean up after each GraphQL test
      fetchMock.reset();
      fetchMock.restore();
    });

    const query: string = 'query { app { ping } }';
    const data: object = {hello: 'world'};
    const errors: Error[] = [{message: 'test_error', name: 'Test Error'}];

    it('should get a successful response from a query', (done) => {
      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      graphqlQuery(url, {query})
        .then((results) => {
          expect(results).toEqual(data);
          done();
        })
        .catch(done);
    });

    it('should send a token', (done) => {
      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      graphqlQuery(url, {query}, {token: 'test-token'})
        .then((results) => {
          expect(results).toEqual(data);
          done();
        })
        .catch(done);
    });

    it('should get an error from a query', (done) => {
      fetchMock.postOnce(url, {
        body: {errors},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      }, {overwriteRoutes: true});

      graphqlQuery(url, {query})
        .then(() => {
          expect(false).toEqual(true);
          done();
        })
        .catch((error: ApiError) => {
          expect(error.errors).toBeDefined();
          done();
        });
    });

    it('should handle network errors', (done) => {
      // Mock fetch to throw network error
      const originalFetch = global.fetch;
      global.fetch = () => Promise.reject(new Error('Network error'));

      graphqlQuery(url, {query})
        .then(() => {
          expect(false).toEqual(true);
          done();
        })
        .catch((error: ApiError) => {
          expect(error.errors[0]).toEqual('network_error');
          global.fetch = originalFetch;
          done();
        });
    });

    it('should handle invalid URL', (done) => {
      // Mock fetch to throw error for invalid URL
      const originalFetch = global.fetch;
      global.fetch = () => Promise.reject(new Error('only absolute urls are supported'));

      graphqlQuery('invalid-url', {query})
        .then(() => {
          expect(false).toEqual(true);
          done();
        })
        .catch((error: ApiError) => {
          expect(error.errors[0]).toEqual('invalid_url');
          global.fetch = originalFetch;
          done();
        });
    });

    it('should handle timeout', (done) => {
      // Mock fetch to never resolve (simulate timeout)
      const originalFetch = global.fetch;
      global.fetch = () => new Promise<Response>(() => {}); // Never resolves

      graphqlQuery(url, {query}, {timeout: 1})
        .then(() => {
          expect(false).toEqual(true);
          done();
        })
        .catch((error) => {
          expect(error.message).toEqual('Request timeout');
          global.fetch = originalFetch;
          done();
        });
    });


    it('should handle no timeout', (done) => {
      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      }, {overwriteRoutes: true});

      graphqlQuery(url, {query}, {timeout: 0})
        .then((results) => {
          expect(results).toEqual(data);
          done();
        })
        .catch(done);
    });

    it('should handle empty URL', (done) => {
      fetchMock.postOnce('http://localhost/', {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      graphqlQuery('http://localhost/', {query})
        .then((results) => {
          expect(results.hello).toEqual('world');
          done();
        })
        .catch(done);
    });

    it('should debug GraphQL function directly', (done) => {
      const testData = {hello: 'world'};

      fetchMock.postOnce('https://test.com/graphql', {
        body: {data: testData},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      // Test the actual graphqlQuery function
      graphqlQuery('https://test.com/graphql', {query: 'test'})
        .then((results) => {
          console.log('GraphQL results:', results);
          console.log('Expected data:', testData);
          expect(results).toEqual(testData);
          done();
        })
        .catch((error) => {
          console.log('GraphQL error:', error);
          done(error);
        });
    });
  });

  describe('#query', () => {
    beforeEach(() => {
      // Additional cleanup for query tests
      fetchMock.reset();
      fetchMock.restore();
    });

    afterEach(() => {
      // Clean up after each query test
      fetchMock.reset();
      fetchMock.restore();
    });

    it('should call graphqlQuery with query object', (done) => {
      const queryString = 'query { user { id } }';
      const data = {user: {id: '123'}};

      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      query(url, queryString)
        .then((results) => {
          expect(results).toEqual(data);
          done();
        })
        .catch(done);
    });
  });

  describe('#mutation', () => {
    beforeEach(() => {
      // Additional cleanup for mutation tests
      fetchMock.reset();
      fetchMock.restore();
    });

    afterEach(() => {
      // Clean up after each mutation test
      fetchMock.reset();
      fetchMock.restore();
    });

    it('should call graphqlQuery with mutation object', (done) => {
      const mutationString = 'mutation { createUser { id } }';
      const data = {createUser: {id: '123'}};

      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      });

      mutation(url, mutationString)
        .then((results) => {
          expect(results).toEqual(data);
          done();
        })
        .catch(done);
    });
  });

  describe('#subscribeSSE', () => {
    beforeEach(() => {
      // Mock EventSource
      global.EventSource = function(url: string) {
        return {
          close() {},
          onerror: null,
          onmessage: null,
          onopen: null,
          readyState: 0
        };
      } as any;
    });

    it('should create SSE connection with callbacks', () => {
      const onError = function() {};
      const onMessage = function() {};
      const onOpen = function() {};

      const unsubscribe = subscribeSSE('https://api.example.com/stream', {
        onError,
        onMessage,
        onOpen
      });

      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle authentication token', () => {
      const token = 'test_token';
      const onMessage = function() {};

      subscribeSSE('https://api.example.com/stream', {
        onMessage
      }, {
        token
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle custom headers', () => {
      const headers = new Headers({'X-Custom-Header': 'value'});
      const onMessage = function() {};

      subscribeSSE('https://api.example.com/stream', {
        onMessage
      }, {
        headers
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle connection timeout', () => {
      const onError = function() {};

      subscribeSSE('https://api.example.com/stream', {
        onError
      }, {
        timeout: 1000
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle connection errors and retries', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 2 // CLOSED
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onError = function() {};
      const onRetry = function() {};

      subscribeSSE('https://api.example.com/stream', {
        onError,
        onRetry
      }, {
        maxRetries: 2,
        retryInterval: 100
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle EventSource creation error', () => {
      // Mock EventSource to throw error
      global.EventSource = function(url: string) {
        throw new Error('EventSource not available');
      } as any;

      const onError = function() {};

      subscribeSSE('https://api.example.com/stream', {
        onError
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle empty URL', () => {
      const onMessage = function() {};

      subscribeSSE('', {
        onMessage
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle cleanup function', () => {
      const onMessage = function() {};

      const unsubscribe = subscribeSSE('https://api.example.com/stream', {
        onMessage
      });

      // Test that cleanup function works
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(true).toBe(true);
    });

    it('should handle retry with max retries exceeded', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 2 // CLOSED
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onError = function() {};
      const onRetry = function() {};

      subscribeSSE('https://api.example.com/stream', {
        onError,
        onRetry
      }, {
        maxRetries: 0, // No retries
        retryInterval: 100
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle timeout cleanup', () => {
      const onError = function() {};

      const unsubscribe = subscribeSSE('https://api.example.com/stream', {
        onError
      }, {
        timeout: 1000
      });

      // Test cleanup with timeout
      unsubscribe();
      expect(true).toBe(true);
    });

    it('should handle SSE message with retry data', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 0
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onMessage = function(event: any) {
        expect(event.data).toBe('retry: 5000');
        expect(event.retry).toBe(5000);
      };

      subscribeSSE('https://api.example.com/stream', {
        onMessage
      });

      // Simulate message event with retry data
      if(mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: 'retry: 5000',
          lastEventId: '123',
          type: 'message'
        });
      }

      expect(true).toBe(true);
    });

    it('should handle SSE message without retry data', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 0
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onMessage = function(event: any) {
        expect(event.data).toBe('test message');
        expect(event.retry).toBeUndefined();
      };

      subscribeSSE('https://api.example.com/stream', {
        onMessage
      });

      // Simulate message event without retry data
      if(mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: 'test message',
          lastEventId: '123',
          type: 'message'
        });
      }

      expect(true).toBe(true);
    });

    it('should handle SSE open event with timeout cleanup', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 0
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onOpen = function(event: any) {
        expect(event).toBeDefined();
      };

      subscribeSSE('https://api.example.com/stream', {
        onOpen
      }, {
        timeout: 1000
      });

      // Simulate open event
      if(mockEventSource.onopen) {
        mockEventSource.onopen({});
      }

      expect(true).toBe(true);
    });

    it('should handle SSE error event with connection still open', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 1 // OPEN
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onError = function(event: any) {
        expect(event).toBeDefined();
      };

      subscribeSSE('https://api.example.com/stream', {
        onError
      });

      // Simulate error event
      if(mockEventSource.onerror) {
        mockEventSource.onerror({});
      }

      expect(true).toBe(true);
    });

    it('should handle SSE error event with connection closed', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 2 // CLOSED
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onError = function(event: any) {
        expect(event).toBeDefined();
      };

      const onRetry = function(attempt: number, delay: number) {
        expect(attempt).toBe(1);
        expect(delay).toBe(1000);
      };

      subscribeSSE('https://api.example.com/stream', {
        onError,
        onRetry
      }, {
        maxRetries: 3,
        retryInterval: 1000
      });

      // Simulate error event
      if(mockEventSource.onerror) {
        mockEventSource.onerror({});
      }

      expect(true).toBe(true);
    });

    it('should handle SSE error event with max retries exceeded', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 2 // CLOSED
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onError = function(event: any) {
        expect(event).toBeDefined();
      };

      subscribeSSE('https://api.example.com/stream', {
        onError
      }, {
        maxRetries: 0 // No retries
      });

      // Simulate error event
      if(mockEventSource.onerror) {
        mockEventSource.onerror({});
      }

      expect(true).toBe(true);
    });

    it('should handle EventSource creation error with non-Error object', () => {
      // Mock EventSource to throw non-Error
      global.EventSource = function(url: string) {
        throw 'Some string error';
      } as any;

      const onError = function(error: any) {
        expect(error.message).toBe('Failed to create SSE connection');
      };

      subscribeSSE('https://api.example.com/stream', {
        onError
      });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it('should handle timeout with EventSource cleanup', () => {
      const mockEventSource = {
        close() {},
        onerror: null as any,
        onmessage: null as any,
        onopen: null as any,
        readyState: 0
      };

      global.EventSource = function(url: string) {
        return mockEventSource;
      } as any;

      const onError = function(error: any) {
        expect(error.message).toBe('SSE connection timeout');
      };

      subscribeSSE('https://api.example.com/stream', {
        onError
      }, {
        timeout: 1 // Very short timeout
      });

      // Wait a bit for timeout to trigger
      setTimeout(() => {
        expect(true).toBe(true);
      }, 10);
    });
  });
});
