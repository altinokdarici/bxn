import { URL } from 'node:url';
import type { IncomingMessage } from 'node:http';
import { parseBody } from './parse-body.ts';
import type { EnhancedRequest } from './types.ts';

export async function enhanceRequest(
  req: IncomingMessage,
  url: URL,
  params: Record<string, string> = {},
): Promise<EnhancedRequest> {
  // Parse query parameters with array support
  // Single values: ?foo=bar -> { foo: 'bar' }
  // Multiple values: ?foo=a&foo=b -> { foo: ['a', 'b'] }
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of url.searchParams) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }

  // Parse request body if one exists
  const body = await parseBody(req);

  // Enhance the request object with params, query, and body
  const request = req as EnhancedRequest;
  request.params = params;
  request.query = query;
  request.body = body;

  return request;
}
