import { describe, it } from 'node:test';
import assert from 'node:assert';
import { discoverRoutes, type FileSystem, type Importer, type FileEntry } from './discover-routes.ts';
import type { Handler, Middleware } from '@buildxn/http/lib/types';

function createMockFs(structure: Record<string, FileEntry[]>): FileSystem {
  return {
    async readdir(dir: string) {
      return structure[dir] ?? [];
    },
  };
}

function createMockImporter(
  handlers: Record<string, Handler | Middleware | Middleware[] | [...Middleware[], Handler]>,
): Importer {
  return async (path: string) => {
    for (const [key, value] of Object.entries(handlers)) {
      if (path.includes(key)) {
        return { default: value };
      }
    }
    throw new Error(`Unknown path: ${path}`);
  };
}

describe('discoverRoutes', () => {
  it('discovers a simple get handler', async () => {
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({ 'get.ts': handler }),
    });

    assert.ok(routes['/']);
    assert.strictEqual(routes['/'].get, handler);
  });

  it('discovers multiple methods for same path', async () => {
    const getHandler: Handler = () => ({ statusCode: 200, body: 'get', headers: {} });
    const postHandler: Handler = () => ({ statusCode: 201, body: 'post', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'get.ts', isDirectory: false, isFile: true },
          { name: 'post.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({
        'get.ts': getHandler,
        'post.ts': postHandler,
      }),
    });

    assert.strictEqual(routes['/']?.get, getHandler);
    assert.strictEqual(routes['/']?.post, postHandler);
  });

  it('discovers nested routes', async () => {
    const handler: Handler = () => ({ statusCode: 200, body: 'users', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [{ name: 'users', isDirectory: true, isFile: false }],
        '/routes/users': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({ 'get.ts': handler }),
    });

    assert.ok(routes['/users']);
    assert.strictEqual(routes['/users'].get, handler);
  });

  it('converts $param to :param', async () => {
    const handler: Handler = () => ({ statusCode: 200, body: 'user', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [{ name: 'users', isDirectory: true, isFile: false }],
        '/routes/users': [{ name: '$id', isDirectory: true, isFile: false }],
        '/routes/users/$id': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({ 'get.ts': handler }),
    });

    assert.ok(routes['/users/:id']);
    assert.strictEqual(routes['/users/:id'].get, handler);
  });

  it('discovers deeply nested routes with params', async () => {
    const handler: Handler = () => ({ statusCode: 200, body: 'post', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [{ name: 'users', isDirectory: true, isFile: false }],
        '/routes/users': [{ name: '$userId', isDirectory: true, isFile: false }],
        '/routes/users/$userId': [{ name: 'posts', isDirectory: true, isFile: false }],
        '/routes/users/$userId/posts': [{ name: '$postId', isDirectory: true, isFile: false }],
        '/routes/users/$userId/posts/$postId': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({ 'get.ts': handler }),
    });

    assert.ok(routes['/users/:userId/posts/:postId']);
    assert.strictEqual(routes['/users/:userId/posts/:postId'].get, handler);
  });

  it('ignores non-http-method files', async () => {
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'get.ts', isDirectory: false, isFile: true },
          { name: 'helper.ts', isDirectory: false, isFile: true },
          { name: 'utils.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({ 'get.ts': handler }),
    });

    assert.deepStrictEqual(Object.keys(routes), ['/']);
    assert.deepStrictEqual(Object.keys(routes['/'] ?? {}), ['get']);
  });

  it('ignores non-ts/js files', async () => {
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'get.ts', isDirectory: false, isFile: true },
          { name: 'get.json', isDirectory: false, isFile: true },
          { name: 'get.md', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({ 'get.ts': handler }),
    });

    assert.deepStrictEqual(Object.keys(routes['/'] ?? {}), ['get']);
  });

  it('discovers .js files', async () => {
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [{ name: 'get.js', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({ 'get.js': handler }),
    });

    assert.ok(routes['/']?.get);
  });

  it('discovers handler arrays (middleware + handler)', async () => {
    const middleware: Middleware = (ctx, next) => next(ctx);
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });
    const chain: [Middleware, Handler] = [middleware, handler];

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({ 'get.ts': chain }),
    });

    assert.ok(Array.isArray(routes['/']?.get));
    assert.strictEqual(routes['/']?.get, chain);
  });

  it('discovers all http methods', async () => {
    const get: Handler = () => ({ statusCode: 200, body: 'get', headers: {} });
    const post: Handler = () => ({ statusCode: 200, body: 'post', headers: {} });
    const put: Handler = () => ({ statusCode: 200, body: 'put', headers: {} });
    const patch: Handler = () => ({ statusCode: 200, body: 'patch', headers: {} });
    const del: Handler = () => ({ statusCode: 200, body: 'delete', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'get.ts', isDirectory: false, isFile: true },
          { name: 'post.ts', isDirectory: false, isFile: true },
          { name: 'put.ts', isDirectory: false, isFile: true },
          { name: 'patch.ts', isDirectory: false, isFile: true },
          { name: 'delete.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({
        'get.ts': get,
        'post.ts': post,
        'put.ts': put,
        'patch.ts': patch,
        'delete.ts': del,
      }),
    });

    assert.strictEqual(routes['/']?.get, get);
    assert.strictEqual(routes['/']?.post, post);
    assert.strictEqual(routes['/']?.put, put);
    assert.strictEqual(routes['/']?.patch, patch);
    assert.strictEqual(routes['/']?.delete, del);
  });

  it('returns empty object for empty directory', async () => {
    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [],
      }),
      importer: createMockImporter({}),
    });

    assert.deepStrictEqual(routes, {});
  });

  it('combines routes from multiple nested directories', async () => {
    const usersHandler: Handler = () => ({ statusCode: 200, body: 'users', headers: {} });
    const postsHandler: Handler = () => ({ statusCode: 200, body: 'posts', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'users', isDirectory: true, isFile: false },
          { name: 'posts', isDirectory: true, isFile: false },
        ],
        '/routes/users': [{ name: 'get.ts', isDirectory: false, isFile: true }],
        '/routes/posts': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({
        'users/get.ts': usersHandler,
        'posts/get.ts': postsHandler,
      }),
    });

    assert.strictEqual(routes['/users']?.get, usersHandler);
    assert.strictEqual(routes['/posts']?.get, postsHandler);
  });
  it('applies root middleware to all handlers', async () => {
    const middleware: Middleware = (ctx, next) => next(ctx);
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'middleware.ts', isDirectory: false, isFile: true },
          { name: 'get.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({
        'middleware.ts': middleware,
        'get.ts': handler,
      }),
    });

    const chain = routes['/']?.get as [Middleware, Handler];
    assert.ok(Array.isArray(chain));
    assert.strictEqual(chain.length, 2);
    assert.strictEqual(chain[0], middleware);
    assert.strictEqual(chain[1], handler);
  });

  it('applies nested middleware after parent middleware', async () => {
    const rootMiddleware: Middleware = (ctx, next) => next(ctx);
    const usersMiddleware: Middleware = (ctx, next) => next(ctx);
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'middleware.ts', isDirectory: false, isFile: true },
          { name: 'users', isDirectory: true, isFile: false },
        ],
        '/routes/users': [
          { name: 'middleware.ts', isDirectory: false, isFile: true },
          { name: 'get.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({
        'routes/middleware.ts': rootMiddleware,
        'users/middleware.ts': usersMiddleware,
        'get.ts': handler,
      }),
    });

    const chain = routes['/users']?.get as [Middleware, Middleware, Handler];
    assert.ok(Array.isArray(chain));
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0], rootMiddleware);
    assert.strictEqual(chain[1], usersMiddleware);
    assert.strictEqual(chain[2], handler);
  });

  it('middleware array export adds all middleware', async () => {
    const mw1: Middleware = (ctx, next) => next(ctx);
    const mw2: Middleware = (ctx, next) => next(ctx);
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'middleware.ts', isDirectory: false, isFile: true },
          { name: 'get.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({
        'middleware.ts': [mw1, mw2],
        'get.ts': handler,
      }),
    });

    const chain = routes['/']?.get as [Middleware, Middleware, Handler];
    assert.ok(Array.isArray(chain));
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0], mw1);
    assert.strictEqual(chain[1], mw2);
    assert.strictEqual(chain[2], handler);
  });

  it('combines folder middleware with handler middleware', async () => {
    const folderMiddleware: Middleware = (ctx, next) => next(ctx);
    const handlerMiddleware: Middleware = (ctx, next) => next(ctx);
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'middleware.ts', isDirectory: false, isFile: true },
          { name: 'get.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({
        'middleware.ts': folderMiddleware,
        'get.ts': [handlerMiddleware, handler],
      }),
    });

    const chain = routes['/']?.get as [Middleware, Middleware, Handler];
    assert.ok(Array.isArray(chain));
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0], folderMiddleware);
    assert.strictEqual(chain[1], handlerMiddleware);
    assert.strictEqual(chain[2], handler);
  });

  it('does not apply parent middleware to sibling routes', async () => {
    const usersMiddleware: Middleware = (ctx, next) => next(ctx);
    const usersHandler: Handler = () => ({ statusCode: 200, body: 'users', headers: {} });
    const postsHandler: Handler = () => ({ statusCode: 200, body: 'posts', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'users', isDirectory: true, isFile: false },
          { name: 'posts', isDirectory: true, isFile: false },
        ],
        '/routes/users': [
          { name: 'middleware.ts', isDirectory: false, isFile: true },
          { name: 'get.ts', isDirectory: false, isFile: true },
        ],
        '/routes/posts': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({
        'users/middleware.ts': usersMiddleware,
        'users/get.ts': usersHandler,
        'posts/get.ts': postsHandler,
      }),
    });

    // /users has middleware
    const usersChain = routes['/users']?.get as [Middleware, Handler];
    assert.ok(Array.isArray(usersChain));
    assert.strictEqual(usersChain[0], usersMiddleware);

    // /posts has no middleware
    assert.strictEqual(routes['/posts']?.get, postsHandler);
  });

  it('applies middleware through param directories', async () => {
    const rootMiddleware: Middleware = (ctx, next) => next(ctx);
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'middleware.ts', isDirectory: false, isFile: true },
          { name: 'users', isDirectory: true, isFile: false },
        ],
        '/routes/users': [{ name: '$id', isDirectory: true, isFile: false }],
        '/routes/users/$id': [{ name: 'get.ts', isDirectory: false, isFile: true }],
      }),
      importer: createMockImporter({
        'middleware.ts': rootMiddleware,
        'get.ts': handler,
      }),
    });

    const chain = routes['/users/:id']?.get as [Middleware, Handler];
    assert.ok(Array.isArray(chain));
    assert.strictEqual(chain[0], rootMiddleware);
    assert.strictEqual(chain[1], handler);
  });

  it('supports middleware.js files', async () => {
    const middleware: Middleware = (ctx, next) => next(ctx);
    const handler: Handler = () => ({ statusCode: 200, body: 'ok', headers: {} });

    const routes = await discoverRoutes('/routes', {
      fs: createMockFs({
        '/routes': [
          { name: 'middleware.js', isDirectory: false, isFile: true },
          { name: 'get.ts', isDirectory: false, isFile: true },
        ],
      }),
      importer: createMockImporter({
        'middleware.js': middleware,
        'get.ts': handler,
      }),
    });

    const chain = routes['/']?.get as [Middleware, Handler];
    assert.ok(Array.isArray(chain));
    assert.strictEqual(chain[0], middleware);
  });
});
