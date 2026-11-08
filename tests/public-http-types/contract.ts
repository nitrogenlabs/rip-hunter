import {graphqlRequest, type GraphQLRequestOptions} from '@nlabs/rip-hunter/graphql';
import {assertHttpSuccess, type HttpStatusOptions, httpRequest, startHttpRequest, type HttpRequestOperation, type HttpRequestOptions, type RequestImplementation, readBinaryResponse} from '@nlabs/rip-hunter/http';

const endpoint = 'https://fixture.invalid';
const injected: RequestImplementation = async (input, init) => {
  const inputContract: Parameters<typeof fetch>[0] = input;
  const initContract: Parameters<typeof fetch>[1] = init;
  void inputContract;
  void initContract;
  return new Response(null, {status: 204});
};
const raw: HttpRequestOptions = {body: null, requestImplementation: injected};
const json: HttpRequestOptions = {json: {value: 1}};
const multipart: HttpRequestOptions = {body: new FormData()};
const binary: HttpRequestOptions = {body: new Uint8Array([0, 255])};
const headerRecord: HttpRequestOptions = {headers: {'X-Test': 'one'}};
const headerArray: GraphQLRequestOptions = {headers: [['X-Test', 'two']]};
const headerObject: GraphQLRequestOptions = {headers: new Headers(), requestImplementation: async (input, init) => {
  const inputContract: Parameters<typeof fetch>[0] = input;
  const initContract: Parameters<typeof fetch>[1] = init;
  void inputContract;
  void initContract;
  return new Response('{}');
}};
const syncInference: Promise<number> = httpRequest(endpoint, raw, (response) => {
  const actual: Response = response;
  return actual.status;
});
const asyncInference: Promise<string> = httpRequest(endpoint, json, (response) => response.text());
const binaryInference: Promise<Uint8Array> = httpRequest(endpoint, binary,
  (response) => readBinaryResponse(response, 32));
const graphInference: Promise<{ok: boolean}> = graphqlRequest(endpoint, {query: '{ok}'}, headerObject);
// @ts-expect-error raw and JSON payloads must remain exclusive
const exclusive: HttpRequestOptions = {body: 'raw', json: {}};
// @ts-expect-error exact optional raw bodies reject explicit undefined
const undefinedBody: HttpRequestOptions = {body: undefined};
// @ts-expect-error exact optional HTTP headers reject explicit undefined
const undefinedHeaders: HttpRequestOptions = {headers: undefined};
// @ts-expect-error exact optional GraphQL headers reject explicit undefined
const undefinedGraphHeaders: GraphQLRequestOptions = {headers: undefined};
// @ts-expect-error invalid bodies cannot be plain objects
const invalidBody: HttpRequestOptions = {body: {payload: true}};
// @ts-expect-error header values must remain strings
const invalidHeaders: GraphQLRequestOptions = {headers: {count: 1}};
void [multipart, headerRecord, headerArray, syncInference, asyncInference, binaryInference, graphInference, exclusive,
  undefinedBody, undefinedHeaders, undefinedGraphHeaders, invalidBody, invalidHeaders];

// Compile only: the public operation retains callback inference and immutable handles.
const operation: HttpRequestOperation<number> = startHttpRequest(endpoint, raw, (response) => response.status);
const operationResult: Promise<number> = operation.result;
const originalSettlement: Promise<void> = operation.settled;
const asynchronousOperation: Promise<string> = startHttpRequest(endpoint, json, (response) => response.text()).result;
operation.cancel({privateCallerReason: true});
// @ts-expect-error operation handles are readonly
operation.result = Promise.resolve(0);
void [operationResult, originalSettlement, asynchronousOperation];

const statusPolicy: HttpStatusOptions = {throwHttpErrors: true};
const statusInference: Promise<void> = assertHttpSuccess(new Response(), statusPolicy);
// @ts-expect-error status policy remains a boolean across platform frameworks
const invalidStatusPolicy: HttpStatusOptions = {throwHttpErrors: 'false'};
void [statusInference, invalidStatusPolicy];
