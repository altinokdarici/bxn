import { Server } from 'node:http';
import { Server as HttpsServer } from 'node:https';
import type { ServerOptions as HttpsServerOptions } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Routes } from './types.ts';
import { createRequestContext } from './create-request-context.ts';
import { findMatchingRoute } from './find-matching-route.ts';
import type { HttpMethod } from './http-methods.ts';
import { writeResponse } from './write-response.ts';
import { internalServerError, methodNotAllowed, notFound } from './http-result.ts';

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
        return writeResponse(res, notFound());
      }

      const handler = routes[match.pattern]?.[method as HttpMethod];
      const params = match.params;

      if (!handler) {
        return writeResponse(
          res,
          methodNotAllowed(undefined, { Allow: Object.keys(routes[match.pattern] || {}).join(', ') }),
        );
      }

      // Enhance the request object with params, query, and body
      const request = await createRequestContext(req, url, params);

      // Execute handler and get HttpResult
      const result = await handler(request);

      // Execute the result to write to the response
      writeResponse(res, result);
    } catch (error) {
      console.error('Server error:', error);
      if (!res.headersSent) {
        writeResponse(res, internalServerError());
      }
    }
  };

  // Create either HTTP or HTTPS server based on options
  if (options?.https) {
    return new HttpsServer(options.https, requestHandler);
  }

  return new Server(requestHandler);
}
