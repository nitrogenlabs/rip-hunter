import {jest} from '@jest/globals';

import {subscribeSSE} from './index';

describe('SSE Functionality', () => {
  it('should create SSE subscription with proper cleanup', () => {
    const mockEventSource = {
      close: jest.fn(),
      onerror: null as any,
      onmessage: null as any,
      onopen: null as any,
      readyState: 0
    };

    global.EventSource = jest.fn(() => mockEventSource) as any;

    const onError = jest.fn();
    const onMessage = jest.fn();
    const onOpen = jest.fn();

    const unsubscribe = subscribeSSE('https://api.example.com/stream', {
      onError,
      onMessage,
      onOpen
    });

    expect(global.EventSource).toHaveBeenCalledWith('https://api.example.com/stream');

    if(mockEventSource.onopen) {
      mockEventSource.onopen(new Event('open'));
    }
    expect(onOpen).toHaveBeenCalled();

    if(mockEventSource.onmessage) {
      const messageEvent = new MessageEvent('message', {
        data: '{"type": "notification", "message": "Hello World"}',
        lastEventId: '123'
      });
      mockEventSource.onmessage(messageEvent);
    }
    expect(onMessage).toHaveBeenCalledWith({
      data: '{"type": "notification", "message": "Hello World"}',
      id: '123',
      retry: undefined,
      type: 'message'
    });

    unsubscribe();
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('should handle errors properly', () => {
    const mockEventSource = {
      close: jest.fn(),
      onerror: null as any,
      onmessage: null as any,
      onopen: null as any,
      readyState: 2
    };

    global.EventSource = jest.fn(() => mockEventSource) as any;

    const onError = jest.fn();

    subscribeSSE('https://api.example.com/stream', {
      onError
    });

    if(mockEventSource.onerror) {
      mockEventSource.onerror(new Event('error'));
    }

    expect(onError).toHaveBeenCalled();
  });
});