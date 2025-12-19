import { compileChain } from './compile-chain.ts';
import { jsonSerializer } from './middleware/json-serializer.ts';
import type { HttpMethod } from './http-methods.ts';
import type { RouteDefinitions, Routes } from './types.ts';

export function compileRoutes(definitions: RouteDefinitions): Routes {
  const routes: Routes = {};

  for (const [path, methods] of Object.entries(definitions)) {
    routes[path] = {};
    for (const [method, chain] of Object.entries(methods)) {
      const normalized = Array.isArray(chain) ? chain : [chain];
      routes[path][method as HttpMethod] = compileChain([jsonSerializer, ...normalized]);
    }
  }

  return routes;
}
