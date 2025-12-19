import type { Middleware } from '../types';

export const jsonSerializer: Middleware = async (ctx, next) => {
  const result = await next(ctx);

  // Stream — pass through
  if (result.body instanceof ReadableStream) {
    return result;
  }

  // Buffer — pass through
  if (result.body instanceof Uint8Array || Buffer.isBuffer(result.body)) {
    return result;
  }

  // String — pass through
  if (typeof result.body === 'string') {
    return result;
  }

  // null/undefined — pass through
  if (result.body == null) {
    return result;
  }

  // Object/Array — JSON stringify
  return {
    ...result,
    body: JSON.stringify(result.body),
    headers: {
      ...result.headers,
      'Content-Type': 'application/json',
    },
  };
};
