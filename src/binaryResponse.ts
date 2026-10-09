export class BinaryResponseError extends Error {
  readonly kind = 'limit';

  constructor() {
    super('Binary response exceeds the byte limit.');
    this.name = 'BinaryResponseError';
  }
}

/** Preserve bytes and bound actual streamed output, regardless of response headers. */
export const readBinaryResponse = async (response: Response, maxBytes: number): Promise<Uint8Array> => {
  if(!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new TypeError('Binary response byte limit must be a nonnegative safe integer.');
  }
  if(!response.body) {
    return new Uint8Array();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const limitExceeded = async (): Promise<never> => {
    // Failure to cancel must not replace the known size-limit rejection.
    await reader.cancel().catch(() => undefined);
    throw new BinaryResponseError();
  };
  try {
    const declaredLength = Number(response.headers.get('Content-Length'));
    if(Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return await limitExceeded();
    }
    while(true) {
      // Streams must be read in order to enforce the byte cap before retaining the next chunk.
      // eslint-disable-next-line no-await-in-loop
      const {done, value} = await reader.read();
      if(done) {
        break;
      }
      length += value.byteLength;
      if(length > maxBytes) {
        // Await cancellation before releasing this reader lock in finally.
        // eslint-disable-next-line no-await-in-loop
        return await limitExceeded();
      }
      chunks.push(value.slice());
    }
    const result = new Uint8Array(length);
    let offset = 0;
    for(const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  } finally {
    reader.releaseLock();
  }
};
