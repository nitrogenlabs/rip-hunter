import {expect} from 'chai';
import sinon from 'sinon';
import Immutable from 'immutable';
import fetchMock from 'fetch-mock';
import {Hunter} from '../src';

describe('Hunter', () => {
  const url = 'http://www.test.com/graphql';

  describe('#toGQL', () => {
    it('should convert a string to GQL', () => {
      const str = 'test';
      const gql = Hunter.toGQL(str);
      return expect('"test"').to.eq(gql);
    });

    it('should convert a number to GQL', () => {
      const num = 123;
      const gql = Hunter.toGQL(num);
      return expect(123).to.eq(gql);
    });

    it('should convert a JSON object to GQL', () => {
      const obj = {prop: 'test'};
      const gql = Hunter.toGQL(obj);
      return expect('{prop: "test"}').to.eq(gql);
    });

    it('should convert an immutable object to GQL', () => {
      const obj = Immutable.fromJS({prop: 'test'});
      const gql = Hunter.toGQL(obj);
      return expect('{prop: "test"}').to.eq(gql);
    });
  });

  describe('#query', () => {
    const gql = '{ app { ping } }';
    const data = {hello: 'world'};
    const errors = [{message: 'test_error'}];

    it('should get a successful response from a query', done => {
      fetchMock.postOnce(url, {
        body: {data},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      Hunter.query(url, gql)
        .then(data => {
          expect(data.get('hello')).to.eq('world');
          done();
        })
        .catch(done);
    });

    it('should send a token', done => {
      const token = 'test_token';
      fetchMock.postOnce(url, {
        body: {data},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      Hunter.query(url, gql, token)
        .then(() => {
          const opts = fetchMock.lastOptions();
          expect(opts.headers.Authorization).to.eq(`Bearer ${token}`);
          done();
        })
        .catch(done);
    });

    it('should get an error from a query', done => {
      fetchMock.postOnce(url, {
        body: {errors},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      Hunter.query(url, gql)
        .then(() => {
          expect(false).to.be.true;
          done();
        })
        .catch(error => {
          expect(error.errors.get(0)).to.eq('test_error');
          done();
        });
    });

    it('should emit an error event', done => {
      fetchMock.postOnce(url, {
        body: {errors},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      const spy = sinon.spy();
      Hunter.on('rip_hunter_error', spy);

      Hunter.query(url, gql)
        .then(() => {
          expect(false).to.be.true;
          done();
        })
        .catch(error => {
          expect(spy.called).to.be.true;
          done();
        });
    });
  });

  describe('#mutation', () => {
    const gql = '{ app { ping } }';
    const data = {hello: 'world'};
    const errors = [{message: 'test_error'}];

    it('should get a successful response from a query', done => {
      fetchMock.postOnce(url, {
        body: {data},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      Hunter.mutation(url, gql)
        .then(data => {
          expect(data.get('hello')).to.eq('world');
          done();
        })
        .catch(done);
    });

    it('should send a token', done => {
      const token = 'test_token';
      fetchMock.postOnce(url, {
        body: {data},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      Hunter.mutation(url, gql, token)
        .then(() => {
          const opts = fetchMock.lastOptions();
          expect(opts.headers.Authorization).to.eq(`Bearer ${token}`);
          done();
        })
        .catch(done);
    });

    it('should get an error from a query', done => {
      fetchMock.postOnce(url, {
        body: {errors},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      Hunter.mutation(url, gql)
        .then(() => {
          expect(false).to.be.true;
          done();
        })
        .catch(error => {
          expect(error.errors.get(0)).to.eq('test_error');
          done();
        });
    });

    it('should emit an error event', done => {
      fetchMock.postOnce(url, {
        body: {errors},
        headers: {'Content-Type': 'application/json'},
        status: 200,
        sendAsJson: true
      });

      const spy = sinon.spy();
      Hunter.on('rip_hunter_error', spy);

      Hunter.mutation(url, gql)
        .then(() => {
          expect(false).to.be.true;
          done();
        })
        .catch(error => {
          expect(spy.called).to.be.true;
          done();
        });
    });
  });
});