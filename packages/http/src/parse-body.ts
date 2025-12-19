import type { IncomingMessage } from 'node:http';

const parsersByContentType: Record<string, (data: Buffer<ArrayBufferLike>[]) => unknown> = {
  'application/json': (data) => {
    try {
      return JSON.parse(Buffer.concat(data).toString());
    } catch {
      throw new Error('Invalid JSON body');
    }
  },
  'application/x-www-form-urlencoded': (data) => {
    return Object.fromEntries(new URLSearchParams(Buffer.concat(data).toString()));
  },
  'text/plain': (data) => Buffer.concat(data).toString(),
};

export async function parseBody(req: IncomingMessage): Promise<unknown> {
  const method = req.method?.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return undefined;
  }

  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }

  const contentType = req.headers['content-type'] || '';

  const parser = parsersByContentType[contentType];
  if (parser) {
    return parser(buffers);
  }

  return buffers;
}
