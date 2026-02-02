import type { TSchema } from '@sinclair/typebox';
import type { BaseContext, RouteContext } from './types.ts';

/**
 * Helper type to merge context extensions from before hooks.
 * This is used internally by the RouteBuilder to accumulate context
 * as before hooks are added.
 */
export type MergeContext<TContext extends object, TAdds extends object> = TContext & TAdds;

/**
 * Helper type to extract the final handler context with all schemas applied.
 */
export type HandlerContext<
  TContext extends object,
  TParams extends TSchema,
  TQuery extends TSchema,
  THeaders extends TSchema,
  TBody extends TSchema,
> = RouteContext<TContext, TParams, TQuery, THeaders, TBody>;

/**
 * Type guard to check if a context has the base properties.
 */
export function isBaseContext(ctx: unknown): ctx is BaseContext {
  return (
    typeof ctx === 'object' &&
    ctx !== null &&
    'method' in ctx &&
    'url' in ctx &&
    'path' in ctx &&
    typeof (ctx as BaseContext).method === 'string' &&
    typeof (ctx as BaseContext).url === 'string' &&
    typeof (ctx as BaseContext).path === 'string'
  );
}

/**
 * Creates a base context with the provided properties.
 */
export function createBaseContext(method: string, url: string, path: string): BaseContext {
  return { method, url, path };
}
