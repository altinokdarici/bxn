import type { HttpResult } from '../types.ts';
import type { BeforeHook } from './types.ts';

type UnknownHook = BeforeHook<Record<string, unknown>, Record<string, unknown>>;

/**
 * Composes multiple before hooks into a single hook that executes them sequentially.
 * Each hook can enrich the context and pass it to the next hook in the chain.
 *
 * @param hooks - Array of before hooks to compose
 * @returns A single composed hook
 */
export function composeBeforeHooks<TContext extends object, TAdds extends object = object>(
  hooks: UnknownHook[],
): BeforeHook<TContext, TAdds> {
  if (hooks.length === 0) {
    // No hooks - just call next with original context
    return (ctx, next) => next(ctx as TContext & TAdds);
  }

  if (hooks.length === 1) {
    // Single hook - type assertion is safe because hooks are validated at construction time
    const singleHook = hooks[0] as unknown as BeforeHook<TContext, TAdds>;
    return singleHook;
  }

  // Compose hooks sequentially
  return (ctx, finalNext) => {
    let index = 0;

    const dispatch = (currentCtx: Record<string, unknown>): HttpResult | Promise<HttpResult> => {
      if (index >= hooks.length) {
        // All hooks executed - call final handler
        return finalNext(currentCtx as TContext & TAdds);
      }

      const hook = hooks[index++]!;
      return hook(currentCtx, dispatch);
    };

    return dispatch(ctx as Record<string, unknown>);
  };
}

/**
 * Type helper to extract the context additions from a before hook.
 * This is useful for inferring what a hook adds to the context.
 */
export type ExtractHookAdditions<T> = T extends BeforeHook<Record<string, unknown>, infer TAdds> ? TAdds : never;

/**
 * Type helper to accumulate context additions from multiple hooks.
 */
export type AccumulateHookAdditions<THooks extends UnknownHook[]> = THooks extends [
  BeforeHook<Record<string, unknown>, infer TAdds1>,
  ...infer TRest,
]
  ? TRest extends UnknownHook[]
    ? TAdds1 & AccumulateHookAdditions<TRest>
    : TAdds1
  : object;
