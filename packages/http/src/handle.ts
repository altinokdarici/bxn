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
import type { Handler, Middleware, HttpResult } from './types';
import { createValidationMiddleware } from './middleware/validation.ts';
import { StatusCode } from './status-code.ts';

// Schema constraints
type TParamsProperty = TString | TOptional<TString>;
type TParamsSchema = TObject<Record<string, TParamsProperty>>;

type TQueryProperty =
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
type TQuerySchema = TObject<Record<string, TQueryProperty>>;

type THeadersProperty = TString | TArray<TString> | TOptional<TString> | TOptional<TArray<TString>>;
type THeadersSchema = TObject<Record<string, THeadersProperty>>;

type TBodySchema = TObject;

type TResponseSchema = Partial<Record<StatusCode, { body?: TSchema; headers?: THeadersSchema }>>;

// Infer union of all possible responses
type InferResponses<T extends TResponseSchema> = {
  [K in keyof T & StatusCode]: T[K] extends { body: infer B extends TSchema }
    ? HttpResult<Static<B>, K>
    : HttpResult<unknown, K>;
}[keyof T & StatusCode];

// Handle's own context type - not tied to RequestSchema
interface HandleContext<
  TParams extends TParamsSchema,
  TQuery extends TQuerySchema,
  THeaders extends THeadersSchema,
  TBody extends TBodySchema,
> {
  method: string;
  url: string;
  path: string;
  params: Static<TParams>;
  query: Static<TQuery>;
  headers: Static<THeaders>;
  body: Static<TBody>;
}

// export interface HandleOptions<
//   TParams extends TParamsSchema = TParamsSchema,
//   TQuery extends TQuerySchema = TQuerySchema,
//   THeaders extends THeadersSchema = THeadersSchema,
//   TBody extends TBodySchema = TBodySchema,
//   TResponse extends TResponseSchema = TResponseSchema,
// > {
//   schema?: {
//     params?: TParams;
//     query?: TQuery;
//     headers?: THeaders;
//     body?: TBody;
//     response?: TResponse;
//   };
//   handler: (
//     ctx: HandleContext<TParams, TQuery, THeaders, TBody>,
//   ) => InferResponses<TResponse> | Promise<InferResponses<TResponse>>;
// }

export interface HandleOptions<
  TParams extends TParamsSchema = TParamsSchema,
  TQuery extends TQuerySchema = TQuerySchema,
  THeaders extends THeadersSchema = THeadersSchema,
  TBody extends TBodySchema = TBodySchema,
  TResponse extends TResponseSchema = TResponseSchema,
> {
  schema?: {
    params?: TParams;
    query?: TQuery;
    headers?: THeaders;
    body?: TBody;
    response?: TResponse;
  };
  handler: (
    ctx: HandleContext<TParams, TQuery, THeaders, TBody>,
  ) => TResponse extends Record<string, unknown>
    ? InferResponses<TResponse> | Promise<InferResponses<TResponse>>
    : HttpResult | Promise<HttpResult>;
}

export function handle<
  TParams extends TParamsSchema = TParamsSchema,
  TQuery extends TQuerySchema = TQuerySchema,
  THeaders extends THeadersSchema = THeadersSchema,
  TBody extends TBodySchema = TBodySchema,
  TResponse extends TResponseSchema = TResponseSchema,
>(options: HandleOptions<TParams, TQuery, THeaders, TBody, TResponse>): [Middleware, Handler] {
  const { schema, handler } = options;

  const middleware = createValidationMiddleware({
    params: schema?.params,
    query: schema?.query,
    headers: schema?.headers,
    body: schema?.body,
  });

  return [middleware, handler] as unknown as [Middleware, Handler];
}

// export default handle({
//   schema: {
//     params: Type.Object({
//       id: Type.String(), // Error!
//     }),
//     query: Type.Object({
//       page: Type.Optional(Type.String()),
//     }),
//     headers: Type.Object({
//       authorization: Type.String(),
//     }),
//     body: Type.Object({
//       name: Type.String(),
//       email: Type.String(),
//       role: Type.Union([Type.Literal('admin'), Type.Literal('user')]),
//     }),
//     response: {
//       [StatusCode.Ok]: {
//         body: Type.Object({
//           name: Type.String(),
//           email: Type.String(),
//         }),
//       },
//     },
//   },
//   handler: (ctx) => {
//     console.log(ctx.params.id); // ✅ string
//     console.log(ctx.query.page); // ✅ string | undefined
//     console.log(ctx.headers.authorization); // ✅ string
//     console.log(ctx.body.name); // ✅ string
//     console.log(ctx.body.role); // ✅ 'admin' | 'user'

//     return notFound({
//       name: 'John Doe',
//       email: '',
//     });
//   },
// });
