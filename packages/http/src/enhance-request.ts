import { URL } from 'node:url';
import type { IncomingMessage } from 'node:http';
import { parseBody } from './parse-body.ts';
import type { EnhancedRequest } from './types.ts';

export async function enhanceRequest(
  req: IncomingMessage,
  url: URL,
  params: Record<string, string> = {},
): Promise<EnhancedRequest> {
  // Parse query parameters
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    query[key] = value;
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
