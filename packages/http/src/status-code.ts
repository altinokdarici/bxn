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
