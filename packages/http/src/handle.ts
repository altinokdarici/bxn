import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import type { EnhancedRequest, RequestHandler, QueryParams } from './types.ts';
import type { HttpResult } from './http-result.ts';
import { badRequest } from './http-result.ts';

/**
 * Shared AJV instance for all validators.
 * Configured for optimal DX and performance.
 */
const ajv = new Ajv({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
  strict: true,
  removeAdditional: true,
});

// Add format validators (email, uri, date-time, etc.)
addFormats(ajv);

/**
 * JSON Schema type - accepts any valid JSON Schema object.
 * Works with TypeBox, raw JSON Schema, or any schema library that outputs JSON Schema.
 */
export type JSONSchema = Record<string, unknown>;

/**
 * Infer static type from a schema.
 * When using TypeBox, this resolves to Static<T>.
 * For raw JSON Schema, falls back to unknown.
 */
export type InferSchema<T> = T extends { static: infer S } ? S : unknown;

/**
 * Symbol marker for content-type schemas.
 * Using a Symbol guarantees no collision with user schema properties.
 */
const CONTENT_TYPE_MARKER = Symbol('contentType');

/**
 * Content-type schemas wrapper type.
 * Created via the `contentType()` helper function.
 */
export interface ContentTypeSchemasWrapper<T extends Record<string, JSONSchema> = Record<string, JSONSchema>> {
  [CONTENT_TYPE_MARKER]: true;
  schemas: T;
}

/**
 * Creates a content-type based body schema.
 * Different schemas will be used based on the request's Content-Type header.
 *
 * @example
 * ```typescript
 * body: contentType({
 *   'application/json': Type.Object({ name: Type.String() }),
 *   'application/x-www-form-urlencoded': Type.Object({ username: Type.String() }),
 * })
 * ```
 */
export function contentType<T extends Record<string, JSONSchema>>(schemas: T): ContentTypeSchemasWrapper<T> {
  return {
    [CONTENT_TYPE_MARKER]: true,
    schemas,
  };
}

/**
 * Infer body type from content-type schemas (union of all content type body types).
 */
export type InferContentTypeBody<T extends Record<string, JSONSchema>> = {
  [K in keyof T]: InferSchema<T[K]>;
}[keyof T];

/**
 * Check if a value is a content-type schema wrapper.
 */
function isContentTypeSchemasWrapper(value: unknown): value is ContentTypeSchemasWrapper {
  return typeof value === 'object' && value !== null && CONTENT_TYPE_MARKER in value;
}

/**
 * Response schema for a specific status code with body and optional headers.
 */
export interface ResponseSchema {
  /** Schema for the response body */
  body: JSONSchema;
  /** Schema for response headers (for documentation/OpenAPI) */
  headers?: JSONSchema;
}

/**
 * Response schemas keyed by HTTP status code.
 * @example
 * ```typescript
 * response: {
 *   200: {
 *     body: Type.Object({ id: Type.String() }),
 *     headers: Type.Object({ 'X-Request-Id': Type.String() }),
 *   },
 *   404: {
 *     body: Type.Object({ error: Type.String() }),
 *   },
 * }
 * ```
 */
export type ResponseSchemas = Record<number, ResponseSchema>;

/**
 * Maps a response schema object to a union of allowed HttpResult types.
 * Each status code in the schema becomes an allowed return type.
 *
 * @example
 * ```typescript
 * // Given: response: { 200: { body: AuthorSchema }, 404: { body: ErrorSchema } }
 * // Produces: HttpResult<Author, 200> | HttpResult<Error, 404>
 * ```
 */
export type ResponseToHttpResult<T extends ResponseSchemas> = {
  [K in keyof T & number]: HttpResult<InferSchema<T[K]['body']>, K>;
}[keyof T & number];

/**
 * Body schema - either a single schema or content-type wrapped schemas.
 */
export type BodySchema = JSONSchema | ContentTypeSchemasWrapper;

/**
 * Configuration for the handle() function.
 */
export interface HandleConfig<
  TParams extends JSONSchema | undefined = undefined,
  TQuery extends JSONSchema | undefined = undefined,
  TBody extends JSONSchema | ContentTypeSchemasWrapper | undefined = undefined,
  THeaders extends JSONSchema | undefined = undefined,
  TResponse extends ResponseSchemas | undefined = undefined,
> {
  /** Schema for URL path parameters */
  params?: TParams;
  /** Schema for query string parameters */
  query?: TQuery;
  /**
   * Schema for request body. Can be a single schema or content-type keyed schemas.
   * @example
   * // Single schema (validates all content types)
   * body: Type.Object({ name: Type.String() })
   *
   * // Content-type specific schemas
   * body: {
   *   'application/json': Type.Object({ name: Type.String() }),
   *   'text/plain': Type.String(),
   * }
   */
  body?: TBody;
  /** Schema for request headers */
  headers?: THeaders;
  /** Response schemas keyed by status code (e.g., { 200: schema, 404: schema }) */
  response?: TResponse;
}

/**
 * Validation error details for a specific field.
 */
export interface ValidationErrorDetail {
  field: 'params' | 'query' | 'body' | 'headers' | 'response';
  errors: Array<{
    path: string;
    message: string;
    keyword: string;
  }>;
}

/**
 * Validation error structure returned in error responses.
 */
export interface ValidationError {
  error: 'Validation Failed';
  details: ValidationErrorDetail[];
}

/**
 * Handler function type with inferred types from schemas.
 */
export type SchemaHandler<TParams, TQuery, TBody, TResponse extends HttpResult = HttpResult> = (
  req: EnhancedRequest<TParams, TBody, TQuery>,
) => Promise<TResponse> | TResponse;

/**
 * Formats AJV errors into a cleaner structure.
 */
function formatErrors(errors: ErrorObject[] | null | undefined): ValidationErrorDetail['errors'] {
  if (!errors) return [];
  return errors.map((err) => ({
    path: err.instancePath || '/',
    message: err.message || 'Validation failed',
    keyword: err.keyword,
  }));
}

/**
 * Creates a validated request handler with JSON Schema validation.
 * Schemas are compiled once at module load time for performance.
 * Returns a standard RequestHandler that can be used directly.
 *
 * @example
 * ```typescript
 * import { handle, json, notFound, StatusCode } from '@buildxn/http';
 * import { Type } from '@sinclair/typebox';
 *
 * export default handle({
 *   params: Type.Object({ id: Type.String() }),
 *   headers: Type.Object({ 'x-api-key': Type.String() }),
 *   body: Type.Object({ name: Type.String() }),
 *   response: {
 *     [StatusCode.Ok]: {
 *       body: Type.Object({ id: Type.String(), name: Type.String() }),
 *       headers: Type.Object({ 'X-Request-Id': Type.String() }),
 *     },
 *     [StatusCode.NotFound]: {
 *       body: Type.Object({ error: Type.String() }),
 *     },
 *   },
 * }, (req) => {
 *   const item = db.get(req.params.id);
 *   if (!item) return notFound({ error: 'Not found' });
 *   return json({ id: req.params.id, name: req.body.name });
 * });
 * ```
 */
export function handle<
  TParams extends JSONSchema | undefined = undefined,
  TQuery extends JSONSchema | undefined = undefined,
  TBody extends JSONSchema | ContentTypeSchemasWrapper | undefined = undefined,
  THeaders extends JSONSchema | undefined = undefined,
  TResponse extends ResponseSchemas | undefined = undefined,
>(
  config: HandleConfig<TParams, TQuery, TBody, THeaders, TResponse>,
  handler: SchemaHandler<
    TParams extends JSONSchema ? InferSchema<TParams> : Record<string, string>,
    TQuery extends JSONSchema ? InferSchema<TQuery> : QueryParams,
    TBody extends ContentTypeSchemasWrapper<infer S>
      ? InferContentTypeBody<S>
      : TBody extends JSONSchema
        ? InferSchema<TBody>
        : unknown,
    TResponse extends ResponseSchemas ? ResponseToHttpResult<TResponse> : HttpResult
  >,
): RequestHandler {
  // Pre-compile validators at module load time
  const validators: {
    params?: ValidateFunction;
    query?: ValidateFunction;
    body?: ValidateFunction;
    bodyByContentType?: Record<string, ValidateFunction>;
    headers?: ValidateFunction;
  } = {};

  if (config.params) {
    validators.params = ajv.compile(config.params);
  }
  if (config.query) {
    validators.query = ajv.compile(config.query);
  }
  if (config.body) {
    if (isContentTypeSchemasWrapper(config.body)) {
      // Compile validators for each content type
      validators.bodyByContentType = {};
      for (const [contentType, schema] of Object.entries(config.body.schemas)) {
        validators.bodyByContentType[contentType] = ajv.compile(schema);
      }
    } else {
      validators.body = ajv.compile(config.body);
    }
  }
  if (config.headers) {
    validators.headers = ajv.compile(config.headers);
  }

  // Return a RequestHandler that validates and then calls the inner handler
  return async (req: EnhancedRequest): Promise<HttpResult> => {
    // Validate request
    const validationErrors: ValidationErrorDetail[] = [];

    if (validators.params) {
      const valid = validators.params(req.params ?? {});
      if (!valid) {
        validationErrors.push({
          field: 'params',
          errors: formatErrors(validators.params.errors),
        });
      }
    }

    if (validators.query) {
      const valid = validators.query(req.query ?? {});
      if (!valid) {
        validationErrors.push({
          field: 'query',
          errors: formatErrors(validators.query.errors),
        });
      }
    }

    if (validators.body) {
      const valid = validators.body(req.body ?? {});
      if (!valid) {
        validationErrors.push({
          field: 'body',
          errors: formatErrors(validators.body.errors),
        });
      }
    } else if (validators.bodyByContentType) {
      // Get Content-Type header and normalize it (remove charset, etc.)
      const contentType = req.headers?.['content-type']?.split(';')[0]?.trim().toLocaleLowerCase();

      const supportedTypes = Object.keys(validators.bodyByContentType);

      if (!contentType) {
        // No Content-Type header provided but body schema requires it
        validationErrors.push({
          field: 'body',
          errors: [
            {
              path: '/',
              message: `Content-Type header is required. Supported: ${supportedTypes.join(', ')}`,
              keyword: 'contentType',
            },
          ],
        });
      } else {
        const bodyValidator = validators.bodyByContentType[contentType];
        if (bodyValidator) {
          const valid = bodyValidator(req.body ?? {});
          if (!valid) {
            validationErrors.push({
              field: 'body',
              errors: formatErrors(bodyValidator.errors),
            });
          }
        } else {
          // Content-Type provided but no matching validator - return 400
          validationErrors.push({
            field: 'body',
            errors: [
              {
                path: '/',
                message: `Unsupported Content-Type: ${contentType}. Supported: ${supportedTypes.join(', ')}`,
                keyword: 'contentType',
              },
            ],
          });
        }
      }
    }

    if (validators.headers) {
      const valid = validators.headers(req.headers ?? {});
      if (!valid) {
        validationErrors.push({
          field: 'headers',
          errors: formatErrors(validators.headers.errors),
        });
      }
    }

    // Return 400 if validation failed
    if (validationErrors.length > 0) {
      return badRequest({
        error: 'Validation Failed',
        details: validationErrors,
      } as ValidationError);
    }

    // Call the actual handler
    return handler(
      req as EnhancedRequest<
        TParams extends JSONSchema ? InferSchema<TParams> : Record<string, string>,
        TBody extends ContentTypeSchemasWrapper<infer S>
          ? InferContentTypeBody<S>
          : TBody extends JSONSchema
            ? InferSchema<TBody>
            : unknown,
        TQuery extends JSONSchema ? InferSchema<TQuery> : QueryParams
      >,
    );
  };
}
