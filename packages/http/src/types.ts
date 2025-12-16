import type { IncomingMessage } from 'node:http';
import type { HttpResult } from './http-result.ts';

/** Default query type supporting both single values and arrays */
export type QueryParams = Record<string, string | string[]>;

export interface EnhancedRequest<
  Params = Record<string, string>,
  RequestBody = unknown,
  Query = QueryParams,
> extends IncomingMessage {
  /** URL path params */
  params: Params;
  /** Parsed query string (supports arrays for repeated keys) */
  query: Query;
  /** Parsed body */
  body: RequestBody;
}

export type RequestHandler<
  Params = Record<string, string>,
  Result extends HttpResult = HttpResult,
  RequestBody = unknown,
  Query = QueryParams,
> = (req: EnhancedRequest<Params, RequestBody, Query>) => Promise<Result> | Result;
