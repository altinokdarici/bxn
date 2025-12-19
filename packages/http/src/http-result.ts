import type { Headers, HttpResult } from './types.ts';
import { StatusCode } from './status-code.ts';

/**
 * Creates a JSON result.
 */
function createJsonResult<T, S extends StatusCode>(data: T, statusCode: S, headers: Headers = {}): HttpResult<T, S> {
  return {
    statusCode,
    body: data,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  };
}

/**
 * Creates a text result.
 */
function createTextResult<S extends StatusCode>(
  body: string,
  statusCode: S,
  headers: Headers = {},
): HttpResult<string, S> {
  return {
    statusCode,
    body,
    headers: {
      ...headers,
      'Content-Type': 'text/plain',
    },
  };
}

/**
 * Creates a status-only result.
 */
function createStatusResult<S extends StatusCode>(statusCode: S, headers: Headers = {}): HttpResult<void, S> {
  return {
    body: undefined,
    statusCode,
    headers,
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
 * Type alias for Unauthorized result (401).
 */
export type Unauthorized<T = void> = HttpResult<T, typeof StatusCode.Unauthorized>;

/**
 * Type alias for Forbidden result (403).
 */
export type Forbidden<T = void> = HttpResult<T, typeof StatusCode.Forbidden>;

/**
 * Type alias for MethodNotAllowed result (405).
 */
export type MethodNotAllowed<T = void> = HttpResult<T, typeof StatusCode.MethodNotAllowed>;

/**
 * Type alias for Conflict result (409).
 */
export type Conflict<T = void> = HttpResult<T, typeof StatusCode.Conflict>;

/**
 * Type alias for Gone result (410).
 */
export type Gone<T = void> = HttpResult<T, typeof StatusCode.Gone>;

/**
 * Type alias for UnprocessableEntity result (422).
 */
export type UnprocessableEntity<T = void> = HttpResult<T, typeof StatusCode.UnprocessableEntity>;

/**
 * Type alias for TooManyRequests result (429).
 */
export type TooManyRequests<T = void> = HttpResult<T, typeof StatusCode.TooManyRequests>;

/**
 * Type alias for ServiceUnavailable result (503).
 */
export type ServiceUnavailable<T = void> = HttpResult<T, typeof StatusCode.ServiceUnavailable>;

/**
 * Type alias for redirect responses (301, 302, 307, 308).
 */
export type Redirect = HttpResult<
  void,
  | typeof StatusCode.MovedPermanently
  | typeof StatusCode.Found
  | typeof StatusCode.TemporaryRedirect
  | typeof StatusCode.PermanentRedirect
>;

export type StreamBody = ReadableStream<Uint8Array>;

/**
 * Returns a 200 OK response with JSON data.
 */
export function ok<T>(data: T, headers?: Headers): Ok<T> {
  return createJsonResult(data, StatusCode.Ok, headers);
}

/**
 * Returns a 201 Created response with JSON data.
 */
export function created<T>(data: T, headers?: Headers): Created<T> {
  return createJsonResult(data, StatusCode.Created, headers);
}

/**
 * Returns a JSON response with a custom status code.
 * Defaults to 200 OK when no status code is provided.
 */
export function json<T>(data: T, headers?: Headers): HttpResult<T, typeof StatusCode.Ok>;
export function json<T, S extends StatusCode>(data: T, statusCode: S, headers?: Headers): HttpResult<T, S>;
export function json<T, S extends StatusCode = typeof StatusCode.Ok>(
  data: T,
  statusCodeOrHeaders?: S | Headers,
  headers?: Headers,
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
export function text(textContent: string, headers?: Headers): HttpResult<string, typeof StatusCode.Ok> {
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
 * Returns a 401 Unauthorized response.
 */
export function unauthorized<T = void>(data?: T): Unauthorized<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.Unauthorized) as Unauthorized<T>;
  }
  return createJsonResult(data, StatusCode.Unauthorized);
}

/**
 * Returns a 403 Forbidden response.
 */
export function forbidden<T = void>(data?: T): Forbidden<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.Forbidden) as Forbidden<T>;
  }
  return createJsonResult(data, StatusCode.Forbidden);
}

/**
 * Returns a 405 Method Not Allowed response.
 */
export function methodNotAllowed<T = void>(data?: T, headers?: Headers): MethodNotAllowed<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.MethodNotAllowed, headers) as MethodNotAllowed<T>;
  }
  return createJsonResult(data, StatusCode.MethodNotAllowed, headers);
}

/**
 * Returns a 409 Conflict response.
 */
export function conflict<T = void>(data?: T): Conflict<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.Conflict) as Conflict<T>;
  }
  return createJsonResult(data, StatusCode.Conflict);
}

/**
 * Returns a 410 Gone response.
 */
export function gone<T = void>(data?: T): Gone<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.Gone) as Gone<T>;
  }
  return createJsonResult(data, StatusCode.Gone);
}

/**
 * Returns a 422 Unprocessable Entity response.
 */
export function unprocessableEntity<T = void>(data?: T): UnprocessableEntity<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.UnprocessableEntity) as UnprocessableEntity<T>;
  }
  return createJsonResult(data, StatusCode.UnprocessableEntity);
}

/**
 * Returns a 429 Too Many Requests response.
 */
export function tooManyRequests<T = void>(data?: T): TooManyRequests<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.TooManyRequests) as TooManyRequests<T>;
  }
  return createJsonResult(data, StatusCode.TooManyRequests);
}

/**
 * Returns a 503 Service Unavailable response.
 */
export function serviceUnavailable<T = void>(data?: T): ServiceUnavailable<T> {
  if (data === undefined) {
    return createStatusResult(StatusCode.ServiceUnavailable) as ServiceUnavailable<T>;
  }
  return createJsonResult(data, StatusCode.ServiceUnavailable);
}

/**
 * Returns a redirect response.
 * Defaults to 302 Found (temporary redirect).
 * @param location - The URL to redirect to
 * @param statusCode - The redirect status code (301, 302, 307, or 308). Defaults to 302.
 */
export function redirect(
  location: string,
  statusCode:
    | typeof StatusCode.MovedPermanently
    | typeof StatusCode.Found
    | typeof StatusCode.TemporaryRedirect
    | typeof StatusCode.PermanentRedirect = StatusCode.Found,
): Redirect {
  return createStatusResult(statusCode, { Location: location }) as Redirect;
}

/**
 * Returns a custom status code response.
 */
export function status<S extends StatusCode>(statusCode: S, headers?: Headers): HttpResult<void, S> {
  return createStatusResult(statusCode, headers);
}

export function stream<S extends StatusCode>(
  readable: StreamBody,
  statusCode: S,
  headers: Headers = {},
): HttpResult<StreamBody, S> {
  return {
    statusCode,
    headers,
    body: readable,
  };
}

type SSEMessage = {
  data: unknown;
  event?: string;
  id?: string;
  retry?: number;
};

type SSECleanup = () => void;
type SSEWrite = (message: SSEMessage | unknown) => void;
type SSEClose = () => void;

export function sse(handler: (write: SSEWrite, close: SSEClose) => SSECleanup | void): HttpResult<StreamBody, 200> {
  let cleanup: SSECleanup | void;
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;

      const write: SSEWrite = (message) => {
        let output = '';
        if (typeof message === 'object' && message !== null && 'data' in message) {
          const msg = message as SSEMessage;
          if (msg.event) output += `event: ${msg.event}\n`;
          if (msg.id) output += `id: ${msg.id}\n`;
          if (msg.retry) output += `retry: ${msg.retry}\n`;
          output += `data: ${JSON.stringify(msg.data)}\n\n`;
        } else {
          output = `data: ${JSON.stringify(message)}\n\n`;
        }
        controller.enqueue(encoder.encode(output));
      };

      const close: SSEClose = () => {
        cleanup?.();
        controller.close();
      };

      cleanup = handler(write, close);
    },
    cancel() {
      cleanup?.();
    },
  });

  return stream(readable, 200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
}
