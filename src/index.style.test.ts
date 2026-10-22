import {subscribeSSE} from './index.js';

test('preserves legacy automatic radix parsing for hexadecimal SSE retry text', () => {
  const source = {
    close: vi.fn(),
    onerror: null as ((value: unknown) => void) | null,
    onmessage: null as ((value: unknown) => void) | null,
    onopen: null as ((value: unknown) => void) | null,
    readyState: 0
  };
  vi.stubGlobal('EventSource', class {
    constructor() {
      return source;
    }
  });
  const messages: Array<{retry?: number}> = [];
  const stop = subscribeSSE('https://fixture.invalid/stream', {onMessage: (event) => messages.push(event)});
  try {
    source.onmessage?.({data: 'retry: 0x10', lastEventId: 'synthetic', type: 'message'});

    expect(messages).toHaveLength(1);
    expect(messages[0].retry).toBe(16);
  } finally {
    stop();
    vi.unstubAllGlobals();
  }

  expect(source.close).toHaveBeenCalledOnce();
});
