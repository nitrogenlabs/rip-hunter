import {FetchMock} from '@nlabs/fetch-mock';

import {ajax, graphqlQuery, removeSpaces, toGql} from '.';
import {ApiError} from './errors/ApiError';

describe('rip-hunter', () => {
  const fetchMock = new FetchMock();
  const url = 'http://www.test.com/graphql';

  describe('#toGql', () => {
    it('should convert a string to GQL', () => {
      const str: string = 'test';
      const gql: string = toGql(str);
      return expect('"test"').toEqual(gql);
    });

    it('should convert a number to GQL', () => {
      const num: number = 123;
      const gql: string = toGql(num);
      return expect(123).toEqual(gql);
    });

    it('should convert a JSON object to GQL', () => {
      const obj: object = {prop: 'test'};
      const gql: string = toGql(obj);
      return expect('{prop: "test"}').toEqual(gql);
    });

    it('should convert an array to GQL', () => {
      const array: object[] = [{prop: 'test'}];
      const gql: string = toGql(array);
      return expect('[{prop: "test"}]').toEqual(gql);
    });
  });

  describe('#graphqlQuery', () => {
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
          expect(results.hello).toEqual('world');
          done();
        })
        .catch(done);
    });

    it('should send a token', (done) => {
      const token: string = 'test_token';
      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      }, {overwriteRoutes: true});

      graphqlQuery(url, {query}, {token})
        .then(() => {
          const opts = fetchMock.lastOptions();
          expect(opts.headers.get('Authorization')).toEqual(`Bearer ${token}`);
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
          expect(error.errors[0]).toEqual('test_error');
          done();
        });
    });
  });

  describe('#graphqlQuery mutation', () => {
    const query: string = 'mutation { app { ping } }';
    const data: object = {hello: 'world'};
    const errors: Error[] = [{message: 'test_error', name: 'Test Error'}];

    it('should get a successful response from a query', (done) => {
      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      }, {overwriteRoutes: true});

      graphqlQuery(url, {query})
        .then((results) => {
          expect(results.hello).toEqual('world');
          done();
        })
        .catch(done);
    });

    it('should send a token', (done) => {
      const token: string = 'test_token';
      fetchMock.postOnce(url, {
        body: {data},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      }, {overwriteRoutes: true});

      graphqlQuery(url, {query}, {token})
        .then(() => {
          const opts = fetchMock.lastOptions();
          expect(opts.headers.get('Authorization')).toEqual(`Bearer ${token}`);
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
          expect(error.errors[0]).toEqual('test_error');
          done();
        });
    });
  });

  describe('.ajax', () => {
    const gql: string = '{ app { ping } }';

    it('should be able to post', (done) => {
      fetchMock.postOnce(url, {
        body: {test: 'demo'},
        headers: new Headers({'Content-Type': 'application/json'}),
        sendAsJson: true,
        status: 200
      }, {overwriteRoutes: true});

      ajax(url, 'post', gql)
        .then((response) => {
          console.log('response', response);
          expect(response.test).toEqual('demo');
          done();
        })
        .catch((error: ApiError) => {
          expect(error).toEqual(false);
          done();
        });
    });
  });

  describe('.removeSpaces', () => {
    it('should remove extra spacing except within quotes', () => {
      const str: string = 'test{ method: {id: "hello world"}';
      expect(removeSpaces(str)).toEqual('test{method:{id:"hello world"}');
    });
  });
});
