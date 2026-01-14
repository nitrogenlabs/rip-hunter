import {jest} from '@jest/globals';
import WS from 'jest-websocket-mock';

import {ApiError, subscribe} from './index.js';

describe('GraphQL Subscription Functionality', () => {
  let server: WS;
  const testUrl = 'ws://localhost:1234';

  beforeEach(() => {
    server = new WS(testUrl);
  });

  afterEach(async () => {
    if(server) {
      server.close();
    }
    WS.clean();
  });

  it('should create subscription with proper WebSocket connection', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();
    const onError = jest.fn();
    const onComplete = jest.fn();

    const unsubscribe = subscribe(
      testUrl,
      query,
      {onNext, onError, onComplete}
    );

    await server.connected;

    const initMessageStr = await server.nextMessage;
    const initMessage = JSON.parse(initMessageStr as string);
    expect(initMessage).toMatchObject({
      type: 'connection_init'
    });

    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    expect(startMessage).toMatchObject({
      type: 'start',
      payload: expect.objectContaining({
        query
      })
    });

    unsubscribe();
  });

  it('should handle subscription data messages', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();
    const onError = jest.fn();

    subscribe(testUrl, query, {onNext, onError});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    expect(startMessage).toMatchObject({
      type: 'start',
      payload: expect.objectContaining({query})
    });

    const subscriptionId = (startMessage as any).id;

    const dataMessage = {
      id: subscriptionId,
      type: 'data',
      payload: {
        data: {
          userUpdated: {
            id: '123',
            name: 'Test User'
          }
        }
      }
    };

    server.send(JSON.stringify(dataMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onNext).toHaveBeenCalledWith({
      userUpdated: {
        id: '123',
        name: 'Test User'
      }
    });
  });

  it('should handle subscription error messages', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();
    const onError = jest.fn();

    subscribe(testUrl, query, {onNext, onError});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    const errorMessage = {
      id: subscriptionId,
      type: 'error',
      payload: [{message: 'Subscription error'}]
    };

    server.send(JSON.stringify(errorMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onError).toHaveBeenCalled();
    const error = onError.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
  });

  it('should handle subscription complete messages', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();
    const onComplete = jest.fn();

    subscribe(testUrl, query, {onNext, onComplete});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    const completeMessage = {
      id: subscriptionId,
      type: 'complete'
    };

    server.send(JSON.stringify(completeMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onComplete).toHaveBeenCalled();
  });

  it('should send unsubscribe message when unsubscribe is called', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    const unsubscribe = subscribe(testUrl, query, {onNext});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    unsubscribe();

    const stopMessageStr = await server.nextMessage;
    const stopMessage = JSON.parse(stopMessageStr as string);
    expect(stopMessage).toMatchObject({
      id: subscriptionId,
      type: 'stop'
    });
  });

  it('should include variables in subscription payload', async () => {
    const query = 'subscription { userUpdated(userId: $userId) { id name } }';
    const variables = {userId: '123'};
    const onNext = jest.fn();

    subscribe(testUrl, query, {onNext}, {variables});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    expect(startMessage).toMatchObject({
      type: 'start',
      payload: expect.objectContaining({
        variables
      })
    });
  });

  it('should include connection params in connection_init', async () => {
    const connectionServer = new WS('ws://localhost:1237');
    const query = 'subscription { userUpdated { id name } }';
    const connectionParams = {clientId: 'test-client'};
    const token = 'test-token';

    subscribe('ws://localhost:1237', query, {}, {
      token,
      connectionParams
    });

    await connectionServer.connected;

    const initMessageStr = await connectionServer.nextMessage;
    const initMessage = JSON.parse(initMessageStr as string);
    expect(initMessage.type).toBe('connection_init');
    expect(initMessage.payload).toBeDefined();
    expect(initMessage.payload.clientId).toBe('test-client');
    expect(initMessage.payload.authorization).toBe('Bearer test-token');

    connectionServer.close();
    WS.clean();
  });

  it('should handle WebSocket connection errors', async () => {
    const errorServer = new WS('ws://localhost:1236');
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();

    subscribe('ws://localhost:1236', query, {onError});

    await errorServer.connected;

    const errorMessage = {
      type: 'connection_error',
      payload: {message: 'Connection error'}
    };

    errorServer.send(JSON.stringify(errorMessage));

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(onError).toHaveBeenCalled();

    errorServer.close();
    WS.clean();
  });

  it('should handle empty URL gracefully', () => {
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();

    const unsubscribe = subscribe('', query, {onError});

    expect(onError).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });

  it('should convert HTTP URLs to WebSocket URLs', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const httpServer = new WS('ws://localhost:1235/graphql');

    subscribe('http://localhost:1235/graphql', query, {});

    await httpServer.connected;

    expect(httpServer).toBeDefined();

    httpServer.close();
    await new Promise(resolve => setTimeout(resolve, 50));
    WS.clean();
  });

  it('should handle connection_ack messages', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();
    const onError = jest.fn();

    subscribe(testUrl, query, {onNext, onError});

    await server.connected;

    const ackMessage = {
      type: 'connection_ack'
    };

    server.send(JSON.stringify(ackMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onNext).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle connection_error messages', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();

    subscribe(testUrl, query, {onError});

    await server.connected;

    const errorMessage = {
      type: 'connection_error',
      payload: {message: 'Connection failed'}
    };

    server.send(JSON.stringify(errorMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onError).toHaveBeenCalled();
  });

  it('should reuse connection for multiple subscriptions on same URL', async () => {
    const multiServer = new WS('ws://localhost:1247');
    const query1 = 'subscription { userUpdated { id } }';
    const query2 = 'subscription { postUpdated { id } }';
    const onNext1 = jest.fn();
    const onNext2 = jest.fn();

    const unsubscribe1 = subscribe('ws://localhost:1247', query1, {onNext: onNext1});
    await new Promise(resolve => setTimeout(resolve, 10));
    const unsubscribe2 = subscribe('ws://localhost:1247', query2, {onNext: onNext2});

    await multiServer.connected;

    const initMessageStr = await multiServer.nextMessage;
    expect(JSON.parse(initMessageStr as string).type).toBe('connection_init');

    const messages: string[] = [];
    messages.push(await multiServer.nextMessage as string);
    messages.push(await multiServer.nextMessage as string);

    const parsedMessages = messages.map(msg => JSON.parse(msg));
    const startMessages = parsedMessages.filter(msg => msg.type === 'start');

    expect(startMessages.length).toBe(2);

    const queries = startMessages.map(msg => msg.payload.query);
    expect(queries).toContain(query1);
    expect(queries).toContain(query2);

    unsubscribe1();
    unsubscribe2();
    multiServer.close();
    WS.clean();
  });

  it('should handle data messages without nested data structure', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    subscribe(testUrl, query, {onNext});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    const dataMessage = {
      id: subscriptionId,
      type: 'data',
      payload: {
        userUpdated: {
          id: '123',
          name: 'Test User'
        }
      }
    };

    server.send(JSON.stringify(dataMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onNext).toHaveBeenCalledWith({
      userUpdated: {
        id: '123',
        name: 'Test User'
      }
    });
  });

  it('should handle empty variables', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    subscribe(testUrl, query, {onNext}, {variables: {}});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    expect(startMessage.payload.variables).toEqual({});
  });

  it('should handle subscription with missing callbacks', async () => {
    const query = 'subscription { userUpdated { id name } }';

    const unsubscribe = subscribe(testUrl, query, {});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    expect(startMessageStr).toBeDefined();

    unsubscribe();
  });

  it('should handle invalid JSON message', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();

    subscribe(testUrl, query, {onError});

    await server.connected;

    await server.nextMessage;
    await server.nextMessage;

    server.send('invalid json');

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onError).toHaveBeenCalled();
  });

  it('should handle message for unknown subscription ID', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();
    const onError = jest.fn();

    subscribe(testUrl, query, {onNext, onError});

    await server.connected;

    await server.nextMessage;
    await server.nextMessage;

    const unknownMessage = {
      id: 'unknown_subscription_id',
      type: 'data',
      payload: {data: {userUpdated: {id: '123'}}}
    };

    server.send(JSON.stringify(unknownMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onNext).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle multiple unsubscribe calls', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    const unsubscribe = subscribe(testUrl, query, {onNext});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    unsubscribe();
    unsubscribe();

    const stopMessageStr = await server.nextMessage;
    const stopMessage = JSON.parse(stopMessageStr as string);
    expect(stopMessage.type).toBe('stop');
    expect(stopMessage.id).toBe(subscriptionId);
  });

  it('should handle subscription after connection is established', async () => {
    const query1 = 'subscription { userUpdated { id } }';
    const query2 = 'subscription { postUpdated { id } }';
    const onNext1 = jest.fn();
    const onNext2 = jest.fn();

    subscribe(testUrl, query1, {onNext: onNext1});

    await server.connected;

    await server.nextMessage;
    await server.nextMessage;

    subscribe(testUrl, query2, {onNext: onNext2});

    const startMessage2Str = await server.nextMessage;
    const startMessage2 = JSON.parse(startMessage2Str as string);
    expect(startMessage2.payload.query).toBe(query2);
  });

  it('should handle reconnection callback', async () => {
    const reconnectServer = new WS('ws://localhost:1238');
    const query = 'subscription { userUpdated { id name } }';
    const onReconnect = jest.fn();
    const onError = jest.fn();

    subscribe('ws://localhost:1238', query, {onReconnect, onError}, {
      maxReconnectAttempts: 2,
      reconnectInterval: 100
    });

    await reconnectServer.connected;

    await reconnectServer.nextMessage;
    await reconnectServer.nextMessage;

    reconnectServer.close();

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(onReconnect).toHaveBeenCalled();

    reconnectServer.close();
    WS.clean();
  });

  it('should handle reconnection max attempts exceeded', async () => {
    const maxAttemptsServer = new WS('ws://localhost:1239');
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();

    subscribe('ws://localhost:1239', query, {onError}, {
      maxReconnectAttempts: 1,
      reconnectInterval: 50
    });

    await maxAttemptsServer.connected;

    await maxAttemptsServer.nextMessage;
    await maxAttemptsServer.nextMessage;

    maxAttemptsServer.close();

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('max attempts')
      })
    );

    maxAttemptsServer.close();
    WS.clean();
  });

  it('should handle whitespace in URL', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const whitespaceServer = new WS('ws://localhost:1240');

    subscribe('  ws://localhost:1240  ', query, {});

    await whitespaceServer.connected;

    expect(whitespaceServer).toBeDefined();

    whitespaceServer.close();
    WS.clean();
  });

  it('should convert HTTPS URLs to WSS URLs', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const httpsServer = new WS('wss://localhost:1241/graphql');

    subscribe('https://localhost:1241/graphql', query, {});

    await httpsServer.connected;

    expect(httpsServer).toBeDefined();

    httpsServer.close();
    WS.clean();
  });

  it('should handle error payload as array', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();

    subscribe(testUrl, query, {onError});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    const errorMessage = {
      id: subscriptionId,
      type: 'error',
      payload: [{message: 'Error 1'}, {message: 'Error 2'}]
    };

    server.send(JSON.stringify(errorMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onError).toHaveBeenCalled();
    const error = onError.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
  });

  it('should handle error payload as object', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();

    subscribe(testUrl, query, {onError});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    const errorMessage = {
      id: subscriptionId,
      type: 'error',
      payload: {message: 'Single error object'}
    };

    server.send(JSON.stringify(errorMessage));

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onError).toHaveBeenCalled();
    const error = onError.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
  });

  it('should handle message queue before connection', async () => {
    const queueServer = new WS('ws://localhost:1242', {
      verifyClient: () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(true), 50);
        });
      }
    });

    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    subscribe('ws://localhost:1242', query, {onNext});

    await queueServer.connected;

    await queueServer.nextMessage;
    const startMessageStr = await queueServer.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    expect(startMessage.type).toBe('start');

    queueServer.close();
    WS.clean();
  });

  it('should handle connection error during initial connection', async () => {
    const errorServer = new WS('ws://localhost:1243');
    const query = 'subscription { userUpdated { id name } }';
    const onError = jest.fn();
    const onReconnect = jest.fn();

    subscribe('ws://localhost:1243', query, {onError, onReconnect}, {
      maxReconnectAttempts: 1,
      reconnectInterval: 50
    });

    await errorServer.connected;

    await errorServer.nextMessage;
    await errorServer.nextMessage;

    errorServer.close({code: 1006, reason: 'Connection failed', wasClean: false});

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(onReconnect).toHaveBeenCalled();

    errorServer.close();
    WS.clean();
  });

  it('should handle subscription with null variables', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    subscribe(testUrl, query, {onNext}, {variables: null as any});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    expect(startMessage.payload.variables).toEqual({});
  });

  it('should handle subscription with undefined variables', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    subscribe(testUrl, query, {onNext}, {variables: undefined});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    expect(startMessage.payload.variables).toEqual({});
  });

  it('should handle connection params without token', async () => {
    const paramsServer = new WS('ws://localhost:1244');
    const query = 'subscription { userUpdated { id name } }';
    const connectionParams = {clientId: 'test-client'};

    subscribe('ws://localhost:1244', query, {}, {
      connectionParams
    });

    await paramsServer.connected;

    const initMessageStr = await paramsServer.nextMessage;
    const initMessage = JSON.parse(initMessageStr as string);
    expect(initMessage.payload.clientId).toBe('test-client');
    expect(initMessage.payload.authorization).toBeUndefined();

    paramsServer.close();
    WS.clean();
  });

  it('should handle token without connection params', async () => {
    const tokenServer = new WS('ws://localhost:1245');
    const query = 'subscription { userUpdated { id name } }';
    const token = 'test-token';

    subscribe('ws://localhost:1245', query, {}, {
      token
    });

    await tokenServer.connected;

    const initMessageStr = await tokenServer.nextMessage;
    const initMessage = JSON.parse(initMessageStr as string);
    expect(initMessage.payload.authorization).toBe('Bearer test-token');

    tokenServer.close();
    WS.clean();
  });

  it('should handle multiple data messages for same subscription', async () => {
    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    subscribe(testUrl, query, {onNext});

    await server.connected;

    await server.nextMessage;
    const startMessageStr = await server.nextMessage;
    const startMessage = JSON.parse(startMessageStr as string);
    const subscriptionId = startMessage.id;

    const dataMessage1 = {
      id: subscriptionId,
      type: 'data',
      payload: {
        data: {
          userUpdated: {id: '1', name: 'User 1'}
        }
      }
    };

    const dataMessage2 = {
      id: subscriptionId,
      type: 'data',
      payload: {
        data: {
          userUpdated: {id: '2', name: 'User 2'}
        }
      }
    };

    server.send(JSON.stringify(dataMessage1));
    server.send(JSON.stringify(dataMessage2));

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(onNext).toHaveBeenCalledTimes(2);
    expect(onNext).toHaveBeenNthCalledWith(1, {
      userUpdated: {id: '1', name: 'User 1'}
    });
    expect(onNext).toHaveBeenNthCalledWith(2, {
      userUpdated: {id: '2', name: 'User 2'}
    });
  });

  it('should handle unsubscribe before connection is established', async () => {
    const slowServer = new WS('ws://localhost:1246', {
      verifyClient: () => {
        return new Promise(resolve => {
          setTimeout(() => resolve(true), 100);
        });
      }
    });

    const query = 'subscription { userUpdated { id name } }';
    const onNext = jest.fn();

    const unsubscribe = subscribe('ws://localhost:1246', query, {onNext});

    unsubscribe();

    await slowServer.connected;

    await new Promise(resolve => setTimeout(resolve, 50));

    slowServer.close();
    WS.clean();
  });
});
