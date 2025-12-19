import type { Handler, Middleware, HttpResult, RequestContext } from './types.ts';

type ChainItem = Middleware | Handler;

export function compileChain(chain: ChainItem[] | Handler): Handler {
  if (typeof chain === 'function') {
    return chain;
  }

  return (initialCtx: RequestContext): Promise<HttpResult> => {
    let index = 0;

    const run = (ctx: RequestContext): Promise<HttpResult> => {
      const current = chain[index++];

      if (index === chain.length) {
        return Promise.resolve((current as Handler)(ctx));
      }

      return Promise.resolve((current as Middleware)(ctx, (extendedCtx) => run(extendedCtx)));
    };

    return run(initialCtx);
  };
}
