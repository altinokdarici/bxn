import { type Routes, isHttpMethod, type HttpMethod } from '@buildxn/http';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function discoverRoutes(dir: string, basePath = ''): Promise<Routes> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const routes: Routes = {};
  const timestamp = Date.now();

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Convert $param directories to :param route segments
      const segment = entry.name.startsWith('$') ? `:${entry.name.slice(1)}` : entry.name;

      // Recursively scan subdirectories
      const subRoutes = await discoverRoutes(fullPath, `${basePath}/${segment}`);
      // Merge subdirectory routes
      for (const [path, methods] of Object.entries(subRoutes)) {
        if (!routes[path]) {
          routes[path] = {};
        }
        Object.assign(routes[path], methods);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const basename = path.basename(entry.name, ext);

      // Handle HTTP methods
      if (isHttpMethod(basename) && ['.ts', '.js'].includes(ext)) {
        // Convert to absolute file:// URL for dynamic import
        const absolutePath = path.resolve(fullPath);
        const fileUrl = `file://${absolutePath}?t=${timestamp}`;
        const module = await import(fileUrl);
        const handler = module.default;

        // Build path-first structure: { '/path': { method: handler } }
        const routePath = basePath || '/';
        if (!routes[routePath]) {
          routes[routePath] = {};
        }
        routes[routePath][basename as HttpMethod] = handler;
      }
    }
  }

  return routes;
}
