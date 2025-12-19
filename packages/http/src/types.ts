import type { HttpMethod } from './http-methods.ts';
import type { StatusCode } from './status-code.ts';

// ============================================
// Base types
// ============================================

type Params = Record<string, string>;
type Query = Record<string, string | string[]>;
export type Headers = Record<string, string | string[]>;

// ============================================
// Request schema & context
// ============================================

export type RequestSchema = {
  params?: Params;
  query?: Query;
  body?: unknown;
  headers?: Headers;
};

export type RequestContext<T extends RequestSchema = RequestSchema> = {
  params: T['params'] extends Params ? T['params'] : Params;
  query: T['query'] extends Query ? T['query'] : Query;
  body: T['body'];
  headers: T['headers'] extends Headers ? T['headers'] : Headers;
} & Omit<T, 'params' | 'query' | 'body' | 'headers'>;

export type HttpResult<TBody = unknown, TStatus extends StatusCode = StatusCode> = {
  readonly statusCode: TStatus;
  readonly body: TBody;
  readonly headers?: Headers;
};

// ============================================
// Endpoint schema
// ============================================

export type EndpointSchema<TResponse extends HttpResult = HttpResult> = RequestSchema & {
  response?: TResponse;
};

// ============================================
// Handler
// ============================================

export type Handler<T extends EndpointSchema = EndpointSchema> = (
  ctx: RequestContext<T>,
) => T['response'] extends HttpResult ? T['response'] | Promise<T['response']> : HttpResult | Promise<HttpResult>;

// ============================================
// Middleware — has next, can return early or continue
// ============================================
type Next<TResponse extends HttpResult = HttpResult, TRequestContext extends RequestContext = RequestContext> = (
  ctx: TRequestContext,
) => TResponse | Promise<TResponse>;

export type Middleware<T extends EndpointSchema = EndpointSchema, TAdds extends object = object> = (
  ctx: RequestContext<T>,
  next: Next<T['response'] extends HttpResult ? T['response'] : HttpResult, RequestContext<T & TAdds>>,
) => T['response'] extends HttpResult ? T['response'] | Promise<T['response']> : HttpResult | Promise<HttpResult>;

// Before compilation — can be chain or single handler
export type RouteDefinitions = Record<string, Partial<Record<HttpMethod, [...Middleware[], Handler] | Handler>>>;

// After compilation — always single handler
export type Routes = Record<string, Partial<Record<HttpMethod, Handler>>>;
