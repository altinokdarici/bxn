import type { TSchema } from '@sinclair/typebox';
import type { Handler, Middleware, HttpResult } from './types.ts';
import { createValidationMiddleware } from './middleware/validation.ts';
import type {
  BaseContext,
  EmptyObject,
  TParamsSchema,
  TQuerySchema,
  THeadersSchema,
  TBodySchema,
  TResponseSchema,
  RouteContext,
  BeforeHook,
  InferResponses,
} from './route-builder/types.ts';
import { composeBeforeHooks } from './route-builder/hooks.ts';

/**
 * RouteBuilder class for fluent route configuration.
 * Provides method chaining with progressive type inference.
 */
export class RouteBuilder<
  TContext extends object = BaseContext,
  TParams extends TSchema = EmptyObject,
  TQuery extends TSchema = EmptyObject,
  THeaders extends TSchema = EmptyObject,
  TBody extends TSchema = EmptyObject,
  TResponse extends TResponseSchema = never,
> {
  private config: {
    schemas: {
      params?: TParams;
      query?: TQuery;
      headers?: THeaders;
      body?: TBody;
      response?: TResponse;
    };
    hooks: Array<BeforeHook<Record<string, unknown>, Record<string, unknown>>>;
  };

  constructor(
    config: {
      schemas?: {
        params?: TParams;
        query?: TQuery;
        headers?: THeaders;
        body?: TBody;
        response?: TResponse;
      };
      hooks?: Array<BeforeHook<Record<string, unknown>, Record<string, unknown>>>;
    } = {},
  ) {
    this.config = {
      schemas: config.schemas ?? {},
      hooks: config.hooks ?? [],
    };
  }

  /**
   * Add params schema validation.
   * @param schema - TypeBox schema for route parameters
   */
  params<P extends TParamsSchema>(schema: P): RouteBuilder<TContext, P, TQuery, THeaders, TBody, TResponse> {
    return new RouteBuilder({
      schemas: { ...this.config.schemas, params: schema },
      hooks: this.config.hooks,
    });
  }

  /**
   * Add query schema validation.
   * @param schema - TypeBox schema for query parameters
   */
  query<Q extends TQuerySchema>(schema: Q): RouteBuilder<TContext, TParams, Q, THeaders, TBody, TResponse> {
    return new RouteBuilder({
      schemas: { ...this.config.schemas, query: schema },
      hooks: this.config.hooks,
    });
  }

  /**
   * Add headers schema validation.
   * @param schema - TypeBox schema for request headers
   */
  headers<H extends THeadersSchema>(schema: H): RouteBuilder<TContext, TParams, TQuery, H, TBody, TResponse> {
    return new RouteBuilder({
      schemas: { ...this.config.schemas, headers: schema },
      hooks: this.config.hooks,
    });
  }

  /**
   * Add body schema validation.
   * @param schema - TypeBox schema for request body
   */
  body<B extends TBodySchema>(schema: B): RouteBuilder<TContext, TParams, TQuery, THeaders, B, TResponse> {
    return new RouteBuilder({
      schemas: { ...this.config.schemas, body: schema },
      hooks: this.config.hooks,
    });
  }

  /**
   * Add response schema for multiple status codes.
   *
   * Response schemas provide:
   * - Type safety: Handler must return one of the defined status codes
   * - Documentation: Used for OpenAPI spec generation
   * - Type inference: Required fields are enforced at compile-time
   *
   * Note: Response schemas are NOT validated at runtime. TypeScript's structural
   * typing allows handlers to return objects with extra properties beyond the schema.
   * This is intentional for performance and flexibility.
   *
   * @param schema - Response schema mapping status codes to body/header schemas
   *
   * @example
   * ```typescript
   * route()
   *   .response({
   *     200: { body: Type.Object({ id: Type.String(), name: Type.String() }) },
   *     404: { body: Type.Object({ error: Type.String() }) }
   *   })
   *   .handle(() => {
   *     return json({ id: '1', name: 'Test' }); // ✓ Valid
   *     return notFound({ error: 'Not found' }); // ✓ Valid
   *     // return badRequest({ error: 'Bad' }); // ✗ Type error - not in schema
   *   })
   * ```
   */
  response<R extends TResponseSchema>(
    schema: R,
  ): RouteBuilder<TContext, TParams, TQuery, THeaders, TBody, R> {
    return new RouteBuilder({
      schemas: { ...this.config.schemas, response: schema },
      hooks: this.config.hooks,
    });
  }

  /**
   * Add lifecycle hooks that execute before the handler.
   * Hooks execute sequentially and can enrich the context.
   * @param hooks - Array of before hooks
   */
  before<TAdds extends object>(
    hooks: Array<BeforeHook<Record<string, unknown>, TAdds>>,
  ): RouteBuilder<TContext & TAdds, TParams, TQuery, THeaders, TBody, TResponse> {
    return new RouteBuilder({
      schemas: this.config.schemas,
      hooks: [...this.config.hooks, ...hooks] as Array<BeforeHook<Record<string, unknown>, Record<string, unknown>>>,
    });
  }

  /**
   * Finalize the route with a handler function.
   * Returns a tuple of [Middleware, Handler] compatible with the framework.
   * @param fn - Handler function receiving the fully-typed context
   */
  handle(
    fn: (
      ctx: RouteContext<TContext, TParams, TQuery, THeaders, TBody>,
    ) => [TResponse] extends [never]
      ? HttpResult | Promise<HttpResult>
      : InferResponses<TResponse> | Promise<InferResponses<TResponse>>,
  ): [Middleware, Handler] {
    // Create validation middleware
    const validationMiddleware = createValidationMiddleware({
      params: this.config.schemas.params,
      query: this.config.schemas.query,
      headers: this.config.schemas.headers,
      body: this.config.schemas.body,
    });

    // If we have before hooks, compose them with validation
    if (this.config.hooks.length > 0) {
      const composedHooks = composeBeforeHooks(this.config.hooks);

      const middleware: Middleware = (ctx, next) => {
        // First run validation
        return validationMiddleware(ctx, (validatedCtx) => {
          // Then run before hooks
          // Cast is safe because hooks are type-checked at builder construction time
          return composedHooks(validatedCtx as Record<string, unknown>, (enrichedCtx) => {
            // Finally call the handler - cast is safe due to builder type constraints
            return next(enrichedCtx as typeof validatedCtx);
          });
        });
      };

      return [middleware, fn as unknown as Handler];
    }

    // No hooks - just validation middleware
    return [validationMiddleware, fn as unknown as Handler];
  }

  /**
   * Metadata accessor for route introspection.
   * Used for isomorphic client generation and OpenAPI docs.
   */
  get _schemas() {
    return this.config.schemas;
  }

  /**
   * Input schema accessor (params, query, headers, body).
   */
  get _input() {
    return {
      params: this.config.schemas.params,
      query: this.config.schemas.query,
      headers: this.config.schemas.headers,
      body: this.config.schemas.body,
    };
  }

  /**
   * Output schema accessor (response).
   */
  get _output() {
    return this.config.schemas.response;
  }
}

/**
 * Entry function to create a new route builder.
 * Start chaining methods to configure your route.
 *
 * @example
 * ```typescript
 * export default route()
 *   .params(Type.Object({ id: Type.String() }))
 *   .query(Type.Object({ page: Type.Optional(Type.Integer()) }))
 *   .handle((ctx) => json({ id: ctx.params.id, page: ctx.query.page }));
 * ```
 */
export function route(): RouteBuilder {
  return new RouteBuilder();
}
