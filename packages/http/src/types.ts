import type { IncomingMessage } from 'node:http';
import type { HttpResult } from './http-result.ts';

export interface EnhancedRequest<
  Params = Record<string, string>,
  RequestBody = unknown,
  Query = Record<string, string>,
> extends IncomingMessage {
  /** URL path params */
  params: Params;
  /** Parsed query string */
  query: Query;
  /** Parsed body */
  body: RequestBody;
}

export type RequestHandler<
  Params = Record<string, string>,
  Result extends HttpResult = HttpResult,
  RequestBody = unknown,
  Query = Record<string, string>,
> = (req: EnhancedRequest<Params, RequestBody, Query>) => Promise<Result> | Result;
