import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Type } from '@sinclair/typebox';
import { handle } from './handle.ts';
import { json, notFound } from './http-result.ts';
import { StatusCode } from './status-code.ts';

describe('handle', () => {
  describe('basic usage', () => {
    it('returns middleware and handler tuple', () => {
      const result = handle({
        handler: () => json({ ok: true }),
      });

      assert.ok(Array.isArray(result));
      assert.strictEqual(result.length, 2);
      assert.strictEqual(typeof result[0], 'function'); // middleware
      assert.strictEqual(typeof result[1], 'function'); // handler
    });

    it('handler receives context', async () => {
      const [, handler] = handle({
        handler: (ctx) => {
          return json({
            method: ctx.method,
            path: ctx.path,
          });
        },
      });

      const ctx = {
        method: 'get',
        url: '/users/123',
        path: '/users/123',
        params: {},
        query: {},
        headers: {},
        body: undefined,
      };

      const result = await handler(ctx);

      assert.strictEqual(result.statusCode, 200);
      assert.deepStrictEqual(result.body, { method: 'get', path: '/users/123' });
    });
  });

  describe('schema validation', () => {
    it('validates params schema', async () => {
      const [middleware] = handle({
        schema: {
          params: Type.Object({
            id: Type.String({ minLength: 1 }),
          }),
        },
        handler: (ctx) => json({ id: ctx.params.id }),
      });

      // Valid params
      const validCtx = {
        method: 'get',
        url: '/users/123',
        path: '/users/123',
        params: { id: '123' },
        query: {},
        headers: {},
        body: undefined,
      };

      const next = () => json({ passed: true });
      const validResult = await middleware(validCtx, next);

      assert.strictEqual(validResult.statusCode, 200);
      assert.deepStrictEqual(validResult.body, { passed: true });

      // Invalid params - empty string
      const invalidCtx = {
        ...validCtx,
        params: { id: '' },
      };

      const invalidResult = await middleware(invalidCtx, next);

      assert.strictEqual(invalidResult.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((invalidResult.body as any).errors);
    });

    it('validates query schema with coercion', async () => {
      const [middleware] = handle({
        schema: {
          query: Type.Object({
            page: Type.Optional(Type.Integer({ minimum: 1 })),
            limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
          }),
        },
        handler: (ctx) => json({ page: ctx.query.page, limit: ctx.query.limit }),
      });

      const ctx = {
        method: 'get',
        url: '/users?page=2&limit=10',
        path: '/users',
        params: {},
        query: { page: '2', limit: '10' }, // strings from URL
        headers: {},
        body: undefined,
      };

      const next = (ctx: unknown) => {
        const c = ctx as { query: { page: number; limit: number } };
        return json({ page: c.query.page, limit: c.query.limit });
      };

      const result = await middleware(ctx, next);

      assert.strictEqual(result.statusCode, 200);
      // After coercion, should be numbers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.strictEqual((result.body as any).page, 2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.strictEqual((result.body as any).limit, 10);
    });

    it('validates body schema', async () => {
      const [middleware] = handle({
        schema: {
          body: Type.Object({
            name: Type.String({ minLength: 1 }),
            email: Type.String({ format: 'email' }),
          }),
        },
        handler: (ctx) => json({ created: ctx.body.name }),
      });

      // Valid body
      const validCtx = {
        method: 'post',
        url: '/users',
        path: '/users',
        params: {},
        query: {},
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
      };

      const next = () => json({ passed: true });
      const validResult = await middleware(validCtx, next);

      assert.strictEqual(validResult.statusCode, 200);

      // Invalid body - missing email
      const invalidCtx = {
        ...validCtx,
        body: { name: 'John' },
      };

      const invalidResult = await middleware(invalidCtx, next);

      assert.strictEqual(invalidResult.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((invalidResult.body as any).errors);
    });

    it('validates headers schema', async () => {
      const [middleware] = handle({
        schema: {
          headers: Type.Object({
            authorization: Type.String({ minLength: 1 }),
          }),
        },
        handler: (ctx) => json({ auth: ctx.headers.authorization }),
      });

      // Valid headers
      const validCtx = {
        method: 'get',
        url: '/protected',
        path: '/protected',
        params: {},
        query: {},
        headers: { authorization: 'Bearer token123' },
        body: undefined,
      };

      const next = () => json({ passed: true });
      const validResult = await middleware(validCtx, next);

      assert.strictEqual(validResult.statusCode, 200);

      // Invalid headers - missing authorization
      const invalidCtx = {
        ...validCtx,
        headers: {},
      };

      const invalidResult = await middleware(invalidCtx, next);

      assert.strictEqual(invalidResult.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((invalidResult.body as any).errors);
    });
  });

  describe('response types', () => {
    it('allows any response when no response schema', () => {
      // This should compile without error
      const [, handler] = handle({
        handler: () => json({ anything: 'works' }),
      });

      assert.ok(handler);
    });

    it('allows defined response types', () => {
      // This should compile without error
      const [, handler] = handle({
        schema: {
          response: {
            [StatusCode.Ok]: {
              body: Type.Object({ id: Type.String() }),
            },
            [StatusCode.NotFound]: {
              body: Type.Object({ error: Type.String() }),
            },
          },
        },
        handler: () => {
          const found = Math.random() > 0.5;
          if (found) {
            return json({ id: '123' });
          }
          return notFound({ error: 'Not found' });
        },
      });

      assert.ok(handler);
    });
  });

  describe('combined schemas', () => {
    it('validates all schemas together', async () => {
      const [middleware, handler] = handle({
        schema: {
          params: Type.Object({
            id: Type.String(),
          }),
          query: Type.Object({
            include: Type.Optional(Type.String()),
          }),
          headers: Type.Object({
            'x-api-key': Type.String(),
          }),
          body: Type.Object({
            name: Type.String(),
          }),
        },
        handler: (ctx) =>
          json({
            id: ctx.params.id,
            include: ctx.query.include,
            apiKey: ctx.headers['x-api-key'],
            name: ctx.body.name,
          }),
      });

      const ctx = {
        method: 'put',
        url: '/users/123?include=posts',
        path: '/users/123',
        params: { id: '123' },
        query: { include: 'posts' },
        headers: { 'x-api-key': 'secret' },
        body: { name: 'John' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const next = (c: any) => handler(c);
      const result = await middleware(ctx, next);

      assert.strictEqual(result.statusCode, 200);
      assert.deepStrictEqual(result.body, {
        id: '123',
        include: 'posts',
        apiKey: 'secret',
        name: 'John',
      });
    });
  });

  describe('async handlers', () => {
    it('supports async handlers', async () => {
      const [, handler] = handle({
        handler: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return json({ async: true });
        },
      });

      const ctx = {
        method: 'get',
        url: '/',
        path: '/',
        params: {},
        query: {},
        headers: {},
        body: undefined,
      };

      const result = await handler(ctx);

      assert.strictEqual(result.statusCode, 200);
      assert.deepStrictEqual(result.body, { async: true });
    });
  });
});
