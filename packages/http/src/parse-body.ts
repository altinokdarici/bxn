import type { IncomingMessage } from 'node:http';

export async function parseBody(req: IncomingMessage): Promise<unknown> {
  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const data = Buffer.concat(buffers).toString();

  if (!data) {
    return undefined;
  }

  const contentType = req.headers['content-type'] || '';

  // Parse JSON
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  // Parse URL-encoded form data
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(data));
  }

  // Return raw string for other content types
  return data;
}
