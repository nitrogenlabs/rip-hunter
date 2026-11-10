import {assertHttpSuccess, type HttpRequestOptions, type HttpStatusOptions} from '@nlabs/rip-hunter/http';
import {type HttpsBytesOptions} from '@nlabs/rip-hunter/node-https';
import type {IncomingMessage} from 'node:http';
const stream: HttpRequestOptions = {body: new ReadableStream<Uint8Array>()};
void stream;
const bytes: HttpsBytesOptions = {connectTimeout: 8000, idleTimeout: 12000,
  inspectResponse: (response) => {
    const contract: IncomingMessage = response;
    void contract;
  }, maxBytes: 1024, payload: new Uint8Array(), signal: new AbortController().signal};
// @ts-expect-error Exact optional phase deadlines cannot be explicitly undefined.
const undefinedConnect: HttpsBytesOptions = {...bytes, connectTimeout: undefined};
// @ts-expect-error Caller signals retain the public AbortSignal type.
const invalidSignal: HttpsBytesOptions = {...bytes, signal: 'foreign'};
void undefinedConnect;
void invalidSignal;

const status: HttpStatusOptions = {maxResponseBytes: 1024};
void assertHttpSuccess(new Response(), status);
// @ts-expect-error Bounded error response policy requires numeric bytes.
const invalidStatus: HttpStatusOptions = {maxResponseBytes: '1024'};
void invalidStatus;
