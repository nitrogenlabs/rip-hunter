import {type HttpRequestOptions} from '@nlabs/rip-hunter/http';
const stream: HttpRequestOptions = {body: new ReadableStream<Uint8Array>()};
void stream;
