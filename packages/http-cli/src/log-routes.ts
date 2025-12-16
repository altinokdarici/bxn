import * as p from '@clack/prompts';
import type { Routes } from '@buildxn/http';

// Log discovered routes in a nice format
export function logRoutes(routes: Routes, routesPath?: string): void {
  const routeCount = Object.values(routes).reduce((sum, methods) => sum + Object.keys(methods).length, 0);

  if (routeCount === 0) {
    p.log.warn('No routes found');
    return;
  }

  // Format routes for display
  const routesList = Object.entries(routes)
    .map(([path, methods]) => {
      const methodsList = Object.keys(methods)
        .map((m) => m.toUpperCase())
        .join(', ');
      return `  ${methodsList.padEnd(20)} ${path}`;
    })
    .join('\n');

  const title = routesPath
    ? `Discovered ${routeCount} route${routeCount === 1 ? '' : 's'} in ${routesPath}`
    : `Discovered ${routeCount} route${routeCount === 1 ? '' : 's'}`;

  p.note(routesList, title);
}
