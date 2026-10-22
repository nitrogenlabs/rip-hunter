import {type HttpRequestOptions} from '@nlabs/rip-hunter/http';
const uriBody: HttpRequestOptions = {body: {uri: 'file:///fixture'}};
void uriBody;
// @ts-expect-error React Native RequestInit does not support browser streaming bodies
const stream: HttpRequestOptions = {body: new ReadableStream<Uint8Array>()};
void stream;
