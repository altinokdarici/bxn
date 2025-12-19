// discover-routes.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { type RouteDefinitions, isHttpMethod, type HttpMethod } from '@buildxn/http';
import type { Handler, Middleware } from '@buildxn/http/lib/types';

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface FileSystem {
  readdir(dir: string): Promise<FileEntry[]>;
}

type RouteHandler = Handler | [...Middleware[], Handler];

export type Importer = (path: string) => Promise<{ default: RouteHandler | Middleware | Middleware[] }>;

const defaultFs: FileSystem = {
  async readdir(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      isFile: e.isFile(),
    }));
  },
};

const defaultImporter: Importer = async (filePath: string) => {
  const timestamp = Date.now();
  const absolutePath = path.resolve(filePath);
  const fileUrl = `file://${absolutePath}?t=${timestamp}`;
  return import(fileUrl);
};

interface DiscoverContext {
  fs: FileSystem;
  importer: Importer;
}

async function discoverRoutesRecursive(
  ctx: DiscoverContext,
  dir: string,
  basePath: string,
  parentMiddleware: Middleware[],
): Promise<RouteDefinitions> {
  const entries = await ctx.fs.readdir(dir);
  const routes: RouteDefinitions = {};

  // Check for middleware.ts in current directory
  const middlewareEntry = entries.find((e) => e.isFile && (e.name === 'middleware.ts' || e.name === 'middleware.js'));

  const currentMiddleware = [...parentMiddleware];

  if (middlewareEntry) {
    const middlewarePath = path.join(dir, middlewareEntry.name);
    const module = await ctx.importer(middlewarePath);
    const exported = module.default;

    if (Array.isArray(exported)) {
      currentMiddleware.push(...(exported as Middleware[]));
    } else {
      currentMiddleware.push(exported as Middleware);
    }
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory) {
      const segment = entry.name.startsWith('$') ? `:${entry.name.slice(1)}` : entry.name;
      const subRoutes = await discoverRoutesRecursive(ctx, fullPath, `${basePath}/${segment}`, currentMiddleware);

      for (const [routePath, methods] of Object.entries(subRoutes)) {
        if (!routes[routePath]) {
          routes[routePath] = {};
        }
        Object.assign(routes[routePath], methods);
      }
    } else if (entry.isFile) {
      const ext = path.extname(entry.name);
      const basename = path.basename(entry.name, ext);

      if (isHttpMethod(basename) && ['.ts', '.js'].includes(ext)) {
        const module = await ctx.importer(fullPath);
        const handler = module.default;

        const routePath = basePath || '/';
        if (!routes[routePath]) {
          routes[routePath] = {};
        }

        // Prepend middleware to handler
        if (currentMiddleware.length > 0) {
          if (Array.isArray(handler)) {
            // Handler is already [middleware..., handler]
            routes[routePath][basename as HttpMethod] = [...currentMiddleware, ...handler] as RouteHandler;
          } else {
            // Handler is just a function
            routes[routePath][basename as HttpMethod] = [...currentMiddleware, handler as Handler];
          }
        } else {
          routes[routePath][basename as HttpMethod] = handler as RouteHandler;
        }
      }
    }
  }

  return routes;
}

export async function discoverRoutes(
  dir: string,
  optionalContext?: Partial<DiscoverContext>,
): Promise<RouteDefinitions> {
  const context: DiscoverContext = {
    fs: optionalContext?.fs ?? defaultFs,
    importer: optionalContext?.importer ?? defaultImporter,
  };

  return discoverRoutesRecursive(context, dir, '', []);
}
