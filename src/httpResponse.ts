import {ApiError} from './errors/ApiError.js';
import type {HunterOptionsType} from './index.js';

// Cache for compiled regex patterns
export const JSON_CONTENT_TYPE_REGEX = /application\/(?:[a-z0-9.+-]+\+)?json\b/i;

// Preserve HTTP failures even when a proxy returns text or malformed JSON.
export const assertHttpSuccess = async (response: Response, options: HunterOptionsType): Promise<void> => {
  if(response.ok || options.throwHttpErrors === false) return;
  let responseBody: unknown;
  try {
    const text = await response.text();
    responseBody = text;
    if(text && JSON_CONTENT_TYPE_REGEX.test(response.headers.get('Content-Type') || '')) {
      try {responseBody = JSON.parse(text);} catch { /* Keep the original response text. */ }
    }
  } catch { /* Status remains available when the response body cannot be read. */ }
  throw new ApiError([{message: 'http_error'}], new Error(`HTTP ${response.status}`), {responseBody, status: response.status});
};

