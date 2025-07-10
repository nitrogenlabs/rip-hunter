/**
 * Cross-fetch polyfill for Node.js environments
 */
import "cross-fetch/polyfill";

// Re-export fetch for convenience
export { fetch, Request, Response, Headers } from "cross-fetch";
