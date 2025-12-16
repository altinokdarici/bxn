import { Server } from 'node:http';
import { Server as HttpsServer } from 'node:https';
import type { ServerOptions as HttpsServerOptions } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RequestHandler } from './types.ts';
import { enhanceRequest } from './enhance-request.ts';
import { findMatchingRoute } from './find-matching-route.ts';
import type { HttpMethod } from './http-methods.ts';

// Routes are path-first: { '/path': { get: handler, post: handler } }
export type Routes = Record<string, Partial<Record<HttpMethod, RequestHandler>>>;

export interface ServerOptions {
  /** HTTPS server options (key, cert, etc.). If provided, creates an HTTPS server */
  https?: HttpsServerOptions;
}

export function createServer(routes: Routes = {}, options?: ServerOptions) {
  const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method?.toLowerCase() || 'get';

    try {
      const routePatterns = Object.keys(routes);
      const match = findMatchingRoute(routePatterns, pathname);

      if (!match) {
        res.statusCode = 404;
        res.end();
        return;
      }

      const handler = routes[match.pattern]?.[method as HttpMethod];
      const params = match.params;

      if (!handler) {
        res.statusCode = 405;
        res.setHeader('Allow', Object.keys(routes[match.pattern] || {}).join(', '));
        res.end();
        return;
      }

      // Enhance the request object with params, query, and body
      const request = await enhanceRequest(req, url, params);

      // Execute handler and get HttpResult
      const result = await handler(request);

      // Execute the result to write to the response
      await result.execute(res);
    } catch (error) {
      console.error('Server error:', error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    }
  };

  // Create either HTTP or HTTPS server based on options
  if (options?.https) {
    return new HttpsServer(options.https, requestHandler);
  }

  return new Server(requestHandler);
}
