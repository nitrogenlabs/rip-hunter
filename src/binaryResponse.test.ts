import {BinaryResponseError, readBinaryResponse} from './binaryResponse.js';

const binary = (chunks: Uint8Array[], headers?: HeadersInit) => new Response(new ReadableStream<Uint8Array>({
  start(controller) {
    for(const chunk of chunks) {
      controller.enqueue(chunk);
    }
    controller.close();
  }}), headers === undefined ? {} : {headers});

describe('bounded binary response', () => {
  it('preserves all byte values and chunk order without text decoding', async () => {
    const bytes = new Uint8Array(Array.from({length: 256}, (_value, index) => index));

    expect(await readBinaryResponse(binary([bytes.subarray(0, 100), bytes.subarray(100)]), 256)).toEqual(bytes);
  });

  it('returns exact empty response and accepts zero limit', async () => {
    expect(await readBinaryResponse(new Response(null, {status: 204}), 0)).toEqual(new Uint8Array());
    expect(await readBinaryResponse(binary([]), 0)).toEqual(new Uint8Array());
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid byte cap %s', async (maxBytes) => {
    await expect(readBinaryResponse(binary([]), maxBytes)).rejects.toBeInstanceOf(TypeError);
  });

  it('rejects declared oversize and cancels before reading', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({cancel, start(controller) {
      controller.enqueue(new Uint8Array([1]));
    }});

    await expect(readBinaryResponse(new Response(stream, {headers: {'Content-Length': '100'}}), 5)).rejects.toBeInstanceOf(BinaryResponseError);
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it.each([undefined, '1', 'invalid', '-1', 'Infinity'])('enforces actual cap despite Content-Length %s', async (length) => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({cancel, start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4]));
    }});
    const headers = length === undefined ? {} : {'Content-Length': length};

    await expect(readBinaryResponse(new Response(stream, {headers}), 3)).rejects.toMatchObject({kind: 'limit'});
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it('keeps size-limit rejection when stream cancellation fails', async () => {
    const stream = new ReadableStream<Uint8Array>({cancel() {
      throw new Error('cancel failed');
    }, start(controller) {
      controller.enqueue(new Uint8Array([1]));
    }});

    await expect(readBinaryResponse(new Response(stream), 0)).rejects.toBeInstanceOf(BinaryResponseError);
    expect(stream.locked).toBe(false);
  });

  it('propagates exact interrupted read error and releases stream lock', async () => {
    const error = new Error('interrupted');
    const stream = new ReadableStream<Uint8Array>({start(controller) {
      controller.error(error);
    }});

    await expect(readBinaryResponse(new Response(stream), 10)).rejects.toBe(error);
    expect(stream.locked).toBe(false);
  });
});
