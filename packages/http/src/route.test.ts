import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Type } from '@sinclair/typebox';
import { route } from './route.ts';
import { json, notFound, unauthorized, tooManyRequests } from './http-result.ts';
import type { BeforeHook } from './route-builder/types.ts';

describe('route()', () => {
  describe('basic chaining', () => {
    it('should create route with params schema', () => {
      const [middleware, handler] = route()
        .params(Type.Object({ id: Type.String() }))
        .handle((ctx) => {
          return json({ id: ctx.params.id });
        });

      assert.ok(middleware);
      assert.ok(handler);
      assert.strictEqual(typeof handler, 'function');
    });

    it('should create route with query schema', () => {
      const [middleware, handler] = route()
        .query(Type.Object({ page: Type.Optional(Type.Integer()) }))
        .handle((ctx) => {
          return json({ page: ctx.query.page });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });

    it('should create route with body schema', () => {
      const [middleware, handler] = route()
        .body(Type.Object({ name: Type.String() }))
        .handle((ctx) => {
          return json({ name: ctx.body.name });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });

    it('should create route with headers schema', () => {
      const [middleware, handler] = route()
        .headers(Type.Object({ authorization: Type.String() }))
        .handle((ctx) => {
          return json({ token: ctx.headers.authorization });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });

    it('should create route with multiple schemas', () => {
      const [middleware, handler] = route()
        .params(Type.Object({ id: Type.String() }))
        .query(Type.Object({ page: Type.Optional(Type.Integer()) }))
        .body(Type.Object({ name: Type.String() }))
        .handle((ctx) => {
          return json({
            id: ctx.params.id,
            page: ctx.query.page,
            name: ctx.body.name,
          });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });
  });

  describe('response schema', () => {
    it('should create route with response schema', () => {
      const [middleware, handler] = route()
        .params(Type.Object({ id: Type.String() }))
        .response({
          200: { body: Type.Object({ id: Type.String(), name: Type.String() }) },
          404: { body: Type.Object({ error: Type.String() }) },
        })
        .handle((ctx) => {
          const found = ctx.params.id === '123';
          if (!found) {
            return notFound({ error: 'Not found' });
          }
          return json({ id: ctx.params.id, name: 'Test' });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });

    it('should enforce response schema types', () => {
      // This test verifies type safety at compile time
      route()
        .response({
          200: { body: Type.Object({ success: Type.Boolean() }) },
          404: { body: Type.Object({ error: Type.String() }) },
        })
        .handle(() => {
          // Valid: returning one of the defined response types
          if (Math.random() > 0.5) {
            return json({ success: true }); // 200
          }
          return notFound({ error: 'Not found' }); // 404
          // Invalid: returning a type not in the schema would be a type error
          // return json({ invalid: 'field' }); // Would fail TypeScript compilation
        });
    });

    it('should allow any HttpResult when no response schema', () => {
      // Without response schema, any HttpResult is allowed
      route().handle(() => {
        // All of these are valid
        if (Math.random() > 0.8) return json({ anything: 'goes' });
        if (Math.random() > 0.6) return notFound({ error: 'test' });
        if (Math.random() > 0.4) return unauthorized({ message: 'no auth' });
        return json({ data: 'value' });
      });
    });
  });

  describe('lifecycle hooks', () => {
    it('should create route with before hooks', async () => {
      type User = { id: string; name: string };

      const authMiddleware: BeforeHook<Record<string, unknown>, { user: User }> = async (ctx, next) => {
        // Simulate auth check
        const user: User = { id: 'user-123', name: 'Test User' };
        return next({ ...ctx, user });
      };

      const [middleware, handler] = route()
        .before([authMiddleware])
        .handle((ctx) => {
          return json({ userId: ctx.user.id });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });

    it('should compose multiple before hooks', async () => {
      type User = { id: string; name: string };
      type RateLimit = { allowed: boolean; remaining: number };

      const authMiddleware: BeforeHook<Record<string, unknown>, { user: User }> = async (ctx, next) => {
        const user: User = { id: 'user-123', name: 'Test User' };
        return next({ ...ctx, user });
      };

      const rateLimitMiddleware: BeforeHook<Record<string, unknown>, { rateLimit: RateLimit }> = async (ctx, next) => {
        const rateLimit: RateLimit = { allowed: true, remaining: 10 };
        return next({ ...ctx, rateLimit });
      };

      const [middleware, handler] = route()
        .before([authMiddleware])
        .before([rateLimitMiddleware])
        .handle((ctx) => {
          if (!ctx.rateLimit.allowed) {
            return tooManyRequests({ error: 'Rate limited' });
          }
          return json({ userId: ctx.user.id, remaining: ctx.rateLimit.remaining });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });

    it('should allow hooks to return early', async () => {
      const authMiddleware: BeforeHook<Record<string, unknown>, { user: { id: string } }> = async () => {
        // Simulate failed auth
        const token = 'invalid';
        if (!token) {
          return unauthorized({ error: 'Missing token' });
        }
        return unauthorized({ error: 'Invalid token' });
      };

      const [middleware] = route()
        .before([authMiddleware])
        .handle((ctx) => {
          return json({ userId: ctx.user.id });
        });

      // Create a mock context
      const mockContext = {
        method: 'GET',
        url: '/test',
        path: '/test',
        params: {},
        query: {},
        headers: {},
        body: undefined,
      };

      // Execute middleware
      const result = await middleware(mockContext, async () => {
        // This handler should not be called due to early return
        return json({ success: true });
      });

      assert.strictEqual(result.statusCode, 401);
      assert.deepStrictEqual(result.body, { error: 'Invalid token' });
    });
  });

  describe('reusable base routes', () => {
    it('should create reusable base route with middleware', async () => {
      type User = { id: string; name: string };

      const authMiddleware: BeforeHook<Record<string, unknown>, { user: User }> = async (ctx, next) => {
        const user: User = { id: 'user-123', name: 'Test User' };
        return next({ ...ctx, user });
      };

      // Create base route with auth
      const authedRoute = route().before([authMiddleware]);

      // Use base route to create specific route
      const [middleware, handler] = authedRoute
        .params(Type.Object({ id: Type.String() }))
        .handle((ctx) => {
          return json({ userId: ctx.user.id, resourceId: ctx.params.id });
        });

      assert.ok(middleware);
      assert.ok(handler);
    });

    it('should allow chaining additional middleware on base route', async () => {
      type User = { id: string; name: string };
      type RateLimit = { allowed: boolean; remaining: number };

      const authMiddleware: BeforeHook<Record<string, unknown>, { user: User }> = async (ctx, next) => {
        const user: User = { id: 'user-123', name: 'Test User' };
        return next({ ...ctx, user });
      };

      const rateLimitMiddleware: BeforeHook<Record<string, unknown>, { rateLimit: RateLimit }> = async (ctx, next) => {
        const rateLimit: RateLimit = { allowed: true, remaining: 10 };
        return next({ ...ctx, rateLimit });
      };

      // Create base route with auth
      const authedRoute = route().before([authMiddleware]);

      // Extend base route with additional middleware
      const rateLimitedRoute = authedRoute.before([rateLimitMiddleware]);

      // Use extended route
      const [middleware, handler] = rateLimitedRoute.handle((ctx) => {
        return json({
          userId: ctx.user.id,
          remaining: ctx.rateLimit.remaining,
        });
      });

      assert.ok(middleware);
      assert.ok(handler);
    });
  });

  describe('validation integration', () => {
    it('should validate params and return 400 on invalid input', async () => {
      const [middleware, handler] = route()
        .params(Type.Object({ id: Type.String() }))
        .handle((ctx) => {
          return json({ id: ctx.params.id });
        });

      // Create context with missing required param
      const mockContext = {
        method: 'GET',
        url: '/test',
        path: '/test',
        params: {}, // Missing 'id'
        query: {},
        headers: {},
        body: undefined,
      };

      const result = await middleware(mockContext, async (ctx) => {
        return handler(ctx);
      });

      assert.strictEqual(result.statusCode, 400);
      assert.ok(result.body && typeof result.body === 'object' && 'errors' in result.body);
    });

    it('should validate query and coerce types', async () => {
      const [middleware, handler] = route()
        .query(Type.Object({ page: Type.Integer() }))
        .handle((ctx) => {
          return json({ page: ctx.query.page, type: typeof ctx.query.page });
        });

      // Create context with string query param (should be coerced to number)
      const mockContext = {
        method: 'GET',
        url: '/test?page=5',
        path: '/test',
        params: {},
        query: { page: '5' }, // String that should be coerced to number
        headers: {},
        body: undefined,
      };

      const result = await middleware(mockContext, async (ctx) => {
        return handler(ctx);
      });

      assert.strictEqual(result.statusCode, 200);
      assert.deepStrictEqual(result.body, { page: 5, type: 'number' });
    });
  });

  describe('metadata accessors', () => {
    it('should expose _schemas accessor', () => {
      const builder = route()
        .params(Type.Object({ id: Type.String() }))
        .query(Type.Object({ page: Type.Optional(Type.Integer()) }));

      assert.ok(builder._schemas);
      assert.ok(builder._schemas.params);
      assert.ok(builder._schemas.query);
    });

    it('should expose _input accessor', () => {
      const builder = route()
        .params(Type.Object({ id: Type.String() }))
        .query(Type.Object({ page: Type.Optional(Type.Integer()) }))
        .body(Type.Object({ name: Type.String() }));

      assert.ok(builder._input);
      assert.ok(builder._input.params);
      assert.ok(builder._input.query);
      assert.ok(builder._input.body);
    });

    it('should expose _output accessor', () => {
      const builder = route().response({
        200: { body: Type.Object({ id: Type.String() }) },
        404: { body: Type.Object({ error: Type.String() }) },
      });

      assert.ok(builder._output);
      assert.ok(builder._output && typeof builder._output === 'object');
      assert.ok(200 in builder._output);
      assert.ok(404 in builder._output);
    });
  });

  describe('type inference', () => {
    it('should infer params type', () => {
      route()
        .params(Type.Object({ id: Type.String() }))
        .handle((ctx) => {
          // Type check - should not error
          const id: string = ctx.params.id;
          return json({ id });
        });
    });

    it('should infer query type with optional fields', () => {
      route()
        .query(Type.Object({ page: Type.Optional(Type.Integer()) }))
        .handle((ctx) => {
          // Type check - should not error
          const page: number | undefined = ctx.query.page;
          return json({ page });
        });
    });

    it('should infer body type', () => {
      route()
        .body(Type.Object({ name: Type.String(), email: Type.String() }))
        .handle((ctx) => {
          // Type check - should not error
          const name: string = ctx.body.name;
          const email: string = ctx.body.email;
          return json({ name, email });
        });
    });

    it('should infer context extensions from hooks', () => {
      type User = { id: string; name: string };

      const authMiddleware: BeforeHook<Record<string, unknown>, { user: User }> = async (ctx, next) => {
        const user: User = { id: 'user-123', name: 'Test User' };
        return next({ ...ctx, user });
      };

      route()
        .before([authMiddleware])
        .handle((ctx) => {
          // Type check - should not error
          const userId: string = ctx.user.id;
          const userName: string = ctx.user.name;
          return json({ userId, userName });
        });
    });
  });
});
