import type {
  TObject,
  TString,
  TOptional,
  TArray,
  TSchema,
  TInteger,
  TNumber,
  TBoolean,
  TUnion,
  TLiteral,
  Static,
} from '@sinclair/typebox';
import type { StatusCode } from '../status-code.ts';
import type { HttpResult } from '../types.ts';

// ============================================
// Schema constraints (matching handle.ts)
// ============================================

export type TParamsProperty = TString | TOptional<TString>;
export type TParamsSchema = TObject<Record<string, TParamsProperty>>;

export type TQueryProperty =
  | TString
  | TInteger
  | TNumber
  | TBoolean
  | TArray<TString>
  | TUnion<TSchema[]>
  | TLiteral<string | number | boolean>
  | TOptional<TString>
  | TOptional<TInteger>
  | TOptional<TNumber>
  | TOptional<TBoolean>
  | TOptional<TArray<TString>>
  | TOptional<TUnion<TSchema[]>>
  | TOptional<TLiteral<string | number | boolean>>;
export type TQuerySchema = TObject<Record<string, TQueryProperty>>;

export type THeadersProperty = TString | TArray<TString> | TOptional<TString> | TOptional<TArray<TString>>;
export type THeadersSchema = TObject<Record<string, THeadersProperty>>;

export type TBodySchema = TObject;

/**
 * Response schema mapping status codes to response body/header schemas.
 *
 * NOTE: Response schemas are used for:
 * - TypeScript type inference (ensures required fields are present)
 * - OpenAPI documentation generation
 *
 * Response schemas are NOT validated at runtime for performance reasons.
 * TypeScript's structural typing allows extra properties, so handlers can
 * return objects with additional fields beyond what's defined in the schema.
 *
 * @example
 * ```typescript
 * route()
 *   .response({
 *     200: { body: Type.Object({ id: Type.String() }) },
 *     404: { body: Type.Object({ error: Type.String() }) }
 *   })
 *   .handle(() => {
 *     // ✓ Valid: has required 'id' field (extra fields allowed)
 *     return json({ id: '1', extra: 'field' });
 *
 *     // ✓ Valid: correct status code
 *     return notFound({ error: 'Not found' });
 *
 *     // ✗ Type Error: wrong status code (not in schema)
 *     // return badRequest({ error: 'Bad' });
 *   })
 * ```
 */
export type TResponseSchema = Partial<Record<StatusCode, { body?: TSchema; headers?: THeadersSchema }>>;

// ============================================
// Empty object type for default generics
// ============================================

export type EmptyObject = TObject<Record<string, never>>;

// ============================================
// Infer union of all possible responses
// ============================================

export type InferResponses<T extends TResponseSchema> = {
  [K in keyof T & StatusCode]: T[K] extends { body: infer B extends TSchema }
    ? HttpResult<Static<B>, K>
    : HttpResult<unknown, K>;
}[keyof T & StatusCode];

// ============================================
// Base context type
// ============================================

export interface BaseContext {
  method: string;
  url: string;
  path: string;
}

// ============================================
// Route context with accumulated schemas
// ============================================

export type RouteContext<
  TContext extends object = BaseContext,
  TParams extends TSchema = EmptyObject,
  TQuery extends TSchema = EmptyObject,
  THeaders extends TSchema = EmptyObject,
  TBody extends TSchema = EmptyObject,
> = TContext & {
  params: Static<TParams>;
  query: Static<TQuery>;
  headers: Static<THeaders>;
  body: Static<TBody>;
};

// ============================================
// Before hook type (lifecycle middleware)
// ============================================

export type BeforeHook<TContext extends object, TAdds extends object = object> = (
  ctx: TContext,
  next: (enriched: TContext & TAdds) => HttpResult | Promise<HttpResult>,
) => HttpResult | Promise<HttpResult>;
