import type { ServerResponse } from 'node:http';

/**
 * HTTP status codes as a const object for type-safe usage.
 * Use with response schemas: `response: { [StatusCode.Ok]: Schema, [StatusCode.NotFound]: ErrorSchema }`
 */
export const StatusCode = {
  // 2xx Success
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NoContent: 204,

  // 3xx Redirection
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,

  // 4xx Client Errors
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  Conflict: 409,
  Gone: 410,
  UnprocessableEntity: 422,
  TooManyRequests: 429,

  // 5xx Server Errors
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
} as const;

/**
 * Type representing all known status codes.
 */
export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];

/**
 * Represents the result of an HTTP endpoint handler.
 * The generic type T represents the response body type for type safety.
 * The Status type parameter is used for compile-time checking of allowed responses.
 */
export interface HttpResult<T = unknown, Status extends number = number> {
  /**
   * Executes the result, writing the response to the ServerResponse object.
   */
  execute(res: ServerResponse): Promise<void> | void;
  /** Type marker for the response body (not present at runtime) */
  readonly __type?: T;
  /** Status code marker for compile-time checking (not present at runtime) */
  readonly __status?: Status;
}

/**
 * Helper to write headers to the response.
 */
function writeHeaders(
  res: ServerResponse,
  statusCode: number,
  headers: Record<string, string>
): void {
  res.statusCode = statusCode;
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

/**
 * Creates a JSON result.
 */
function createJsonResult<T, S extends number>(
  data: T,
  statusCode: S,
  headers: Record<string, string> = {}
): HttpResult<T, S> {
  return {
    execute(res: ServerResponse) {
      writeHeaders(res, statusCode, {
        'Content-Type': 'application/json',
        ...headers
      });
      res.end(JSON.stringify(data));
    }
  };
}

/**
 * Creates a text result.
 */
function createTextResult<S extends number>(
  text: string,
  statusCode: S,
  headers: Record<string, string> = {}
): HttpResult<string, S> {
  return {
    execute(res: ServerResponse) {
      writeHeaders(res, statusCode, {
        'Content-Type': 'text/plain',
        ...headers
      });
      res.end(text);
    }
  };
}

/**
 * Creates a status-only result.
 */
function createStatusResult<S extends number>(
  statusCode: S,
  headers: Record<string, string> = {}
): HttpResult<void, S> {
  return {
    execute(res: ServerResponse) {
      writeHeaders(res, statusCode, headers);
      res.end();
    }
  };
}

// Type helpers for creating response unions - each has a unique status code

/**
 * Type alias for Ok result (200).
 */
export type Ok<T> = HttpResult<T, typeof StatusCode.Ok>;

/**
 * Type alias for Created result (201).
 */
export type Created<T> = HttpResult<T, typeof StatusCode.Created>;

/**
 * Type alias for NoContent result (204).
 */
export type NoContent = HttpResult<void, typeof StatusCode.NoContent>;

/**
 * Type alias for BadRequest result (400).
 */
export type BadRequest<T = void> = HttpResult<T, typeof StatusCode.BadRequest>;

/**
 * Type alias for NotFound result (404).
 */
export type NotFound<T = void> = HttpResult<T, typeof StatusCode.NotFound>;

/**
 * Type alias for InternalServerError result (500).
 */
export type InternalServerError<T = void> = HttpResult<T, typeof StatusCode.InternalServerError>;

/**
 * Type alias for streaming response.
 */
export type Stream = HttpResult<void, number>;

/**
 * Returns a 200 OK response with JSON data.
 */
export function ok<T>(data: T, headers?: Record<string, string>): Ok<T> {
  return createJsonResult(data, StatusCode.Ok, headers);
}

/**
 * Returns a 201 Created response with JSON data.
 */
export function created<T>(data: T, headers?: Record<string, string>): Created<T> {
  return createJsonResult(data, StatusCode.Created, headers);
}

/**
 * Returns a JSON response with a custom status code.
 * Defaults to 200 OK when no status code is provided.
 */
export function json<T>(data: T, headers?: Record<string, string>): HttpResult<T, typeof StatusCode.Ok>;
export function json<T, S extends number>(data: T, statusCode: S, headers?: Record<string, string>): HttpResult<T, S>;
export function json<T, S extends number = typeof StatusCode.Ok>(
  data: T,
  statusCodeOrHeaders?: S | Record<string, string>,
  headers?: Record<string, string>
): HttpResult<T, S> {
  // Handle overloads
  if (typeof statusCodeOrHeaders === 'object') {
    return createJsonResult(data, StatusCode.Ok as S, statusCodeOrHeaders);
  }
  return createJsonResult(data, (statusCodeOrHeaders ?? StatusCode.Ok) as S, headers);
}

/**
 * Returns a 200 OK response with plain text.
 */
export function text(textContent: string, headers?: Record<string, string>): HttpResult<string, typeof StatusCode.Ok> {
  return createTextResult(textContent, StatusCode.Ok, headers);
}

/**
 * Returns a 404 Not Found response.
 */
export function notFound<T = void>(data?: T): NotFound<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.NotFound) as NotFound<T>;
  }
  return createJsonResult(data, StatusCode.NotFound);
}

/**
 * Returns a 400 Bad Request response.
 */
export function badRequest<T = void>(data?: T): BadRequest<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.BadRequest) as BadRequest<T>;
  }
  return createJsonResult(data, StatusCode.BadRequest);
}

/**
 * Returns a 204 No Content response.
 */
export function noContent(): NoContent {
  return createStatusResult(StatusCode.NoContent);
}

/**
 * Returns a 500 Internal Server Error response.
 */
export function internalServerError<T = void>(data?: T): InternalServerError<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.InternalServerError) as InternalServerError<T>;
  }
  return createJsonResult(data, StatusCode.InternalServerError);
}

/**
 * Returns a custom status code response.
 */
export function status<S extends number>(statusCode: S, headers?: Record<string, string>): HttpResult<void, S> {
  return createStatusResult(statusCode, headers);
}

/**
 * Returns a streaming response.
 * The writer function receives the response object and has full control
 * over status code, headers, and streaming the body.
 */
export function stream(
  writer: (res: ServerResponse) => Promise<void> | void
): Stream {
  return {
    async execute(res: ServerResponse) {
      await writer(res);
    }
  };
}