import {readBinaryResponse} from './binaryResponse.js';
import {ApiError} from './errors/ApiError.js';

export type HttpStatusOptions = {
  /** Bound actual error response bytes; omitted preserves legacy body handling. */
  readonly maxResponseBytes?: number;
  readonly throwHttpErrors?: boolean;
};

// Cache for compiled regex patterns
export const JSON_CONTENT_TYPE_REGEX = /application\/(?:[a-z0-9.+-]+\+)?json\b/i;

// Preserve HTTP failures even when a proxy returns text or malformed JSON.
export const assertHttpSuccess = async (response: Response, options: HttpStatusOptions): Promise<void> => {
  if(options.maxResponseBytes !== undefined
    && (!Number.isSafeInteger(options.maxResponseBytes) || options.maxResponseBytes < 0)) {
    throw new TypeError('HTTP error response byte limit must be a nonnegative safe integer.');
  }
  if(response.ok || options.throwHttpErrors === false) {
    return;
  }
  let responseBody: unknown;
  try {
    const text = options.maxResponseBytes === undefined ? await response.text()
      : new TextDecoder().decode(await readBinaryResponse(response, options.maxResponseBytes));
    responseBody = text;
    if(text && JSON_CONTENT_TYPE_REGEX.test(response.headers.get('Content-Type') || '')) {
      try {
        responseBody = JSON.parse(text);
      } catch{ /* Keep the original response text. */ }
    }
  } catch{ /* Status remains available when the response body cannot be read. */ }
  throw new ApiError([{message: 'http_error'}], new Error(`HTTP ${response.status}`), {responseBody, status: response.status});
};

