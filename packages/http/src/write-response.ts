import type { ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { HttpResult } from './types.ts';

export async function writeResponse(res: ServerResponse, result: HttpResult): Promise<void> {
  res.statusCode = result.statusCode;

  for (const [key, value] of Object.entries(result.headers ?? {})) {
    res.setHeader(key, value);
  }

  const body = result.body;

  if (body === null || body === undefined) {
    res.end();
    return;
  }

  if (Buffer.isBuffer(body) || typeof body === 'string') {
    res.end(body);
    return;
  }

  // Handle ReadableStream (Web Streams API)
  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch {
      res.end();
    }
    return;
  }

  // Handle Node.js Readable stream
  if (body instanceof Readable) {
    body.pipe(res);
    return;
  }

  // If we get here, jsonSerializer didn't run - throw
  throw new Error('Response body must be a string, Buffer, or stream. Did jsonSerializer run?');
}
