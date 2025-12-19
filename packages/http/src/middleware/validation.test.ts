// middleware/validation.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Type } from '@sinclair/typebox';
import { createValidationMiddleware } from './validation.ts';
import type { RequestContext, HttpResult } from '../types.ts';

const createContext = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  params: {},
  query: {},
  headers: {},
  body: undefined,
  ...overrides,
});

const successNext = (): HttpResult => ({
  statusCode: 200,
  body: { success: true },
  headers: {},
});

describe('createValidationMiddleware', () => {
  describe('params validation', () => {
    it('passes valid params', async () => {
      const middleware = createValidationMiddleware({
        params: Type.Object({
          id: Type.String(),
        }),
      });

      const ctx = createContext({ params: { id: '123' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });

    it('rejects missing required param', async () => {
      const middleware = createValidationMiddleware({
        params: Type.Object({
          id: Type.String(),
        }),
      });

      const ctx = createContext({ params: {} });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors.length > 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].field.includes('params'));
    });

    it('validates minLength constraint', async () => {
      const middleware = createValidationMiddleware({
        params: Type.Object({
          id: Type.String({ minLength: 3 }),
        }),
      });

      const ctx = createContext({ params: { id: 'ab' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].message.includes('3'));
    });
  });

  describe('query validation', () => {
    it('passes valid query', async () => {
      const middleware = createValidationMiddleware({
        query: Type.Object({
          page: Type.Optional(Type.String()),
        }),
      });

      const ctx = createContext({ query: { page: '1' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });

    it('coerces string to integer', async () => {
      const middleware = createValidationMiddleware({
        query: Type.Object({
          page: Type.Integer(),
        }),
      });

      const ctx = createContext({ query: { page: '5' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.strictEqual((ctx.query as any).page, 5);
    });

    it('coerces string to boolean', async () => {
      const middleware = createValidationMiddleware({
        query: Type.Object({
          active: Type.Boolean(),
        }),
      });

      const ctx = createContext({ query: { active: 'true' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.strictEqual((ctx.query as any).active, true);
    });

    it('validates minimum constraint after coercion', async () => {
      const middleware = createValidationMiddleware({
        query: Type.Object({
          page: Type.Integer({ minimum: 1 }),
        }),
      });

      const ctx = createContext({ query: { page: '0' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].field.includes('query'));
    });

    it('validates maximum constraint after coercion', async () => {
      const middleware = createValidationMiddleware({
        query: Type.Object({
          limit: Type.Integer({ maximum: 100 }),
        }),
      });

      const ctx = createContext({ query: { limit: '150' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
    });
  });

  describe('headers validation', () => {
    it('passes valid headers', async () => {
      const middleware = createValidationMiddleware({
        headers: Type.Object({
          authorization: Type.String(),
        }),
      });

      const ctx = createContext({ headers: { authorization: 'Bearer token' } });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });

    it('rejects missing required header', async () => {
      const middleware = createValidationMiddleware({
        headers: Type.Object({
          authorization: Type.String(),
        }),
      });

      const ctx = createContext({ headers: {} });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].field.includes('headers'));
    });

    it('allows optional headers', async () => {
      const middleware = createValidationMiddleware({
        headers: Type.Object({
          'x-request-id': Type.Optional(Type.String()),
        }),
      });

      const ctx = createContext({ headers: {} });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });
  });

  describe('body validation', () => {
    it('passes valid body', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          name: Type.String(),
          email: Type.String(),
        }),
      });

      const ctx = createContext({
        body: { name: 'John', email: 'john@example.com' },
      });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });

    it('rejects missing required field', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          name: Type.String(),
          email: Type.String(),
        }),
      });

      const ctx = createContext({
        body: { name: 'John' },
      });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].field.includes('body'));
    });

    it('validates nested objects', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          user: Type.Object({
            name: Type.String(),
          }),
        }),
      });

      const ctx = createContext({
        body: { user: {} },
      });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].field.includes('body'));
    });

    it('validates arrays', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          tags: Type.Array(Type.String({ minLength: 1 })),
        }),
      });

      const ctx = createContext({
        body: { tags: ['a', 'b', ''] },
      });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
    });

    it('validates email format', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          email: Type.String({ format: 'email' }),
        }),
      });

      const ctx = createContext({
        body: { email: 'not-an-email' },
      });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
    });

    it('passes valid email format', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          email: Type.String({ format: 'email' }),
        }),
      });

      const ctx = createContext({
        body: { email: 'john@example.com' },
      });
      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });
  });

  describe('combined validation', () => {
    it('validates all schemas together', async () => {
      const middleware = createValidationMiddleware({
        params: Type.Object({ id: Type.String() }),
        query: Type.Object({ include: Type.Optional(Type.String()) }),
        headers: Type.Object({ authorization: Type.String() }),
        body: Type.Object({ name: Type.String() }),
      });

      const ctx = createContext({
        params: { id: '123' },
        query: { include: 'posts' },
        headers: { authorization: 'Bearer token' },
        body: { name: 'John' },
      });

      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });

    it('collects all errors from multiple schemas', async () => {
      const middleware = createValidationMiddleware({
        params: Type.Object({ id: Type.String() }),
        headers: Type.Object({ authorization: Type.String() }),
        body: Type.Object({ name: Type.String() }),
      });

      const ctx = createContext({
        params: {},
        headers: {},
        body: {},
      });

      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors.length >= 3);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fields = (result.body as any).errors.map((e: { field: string }) => e.field);
      assert.ok(fields.some((f: string) => f.includes('params')));
      assert.ok(fields.some((f: string) => f.includes('headers')));
      assert.ok(fields.some((f: string) => f.includes('body')));
    });
  });

  describe('no schema', () => {
    it('passes through when no schemas provided', async () => {
      const middleware = createValidationMiddleware({});

      const ctx = createContext({
        params: { anything: 'goes' },
        query: { whatever: 'works' },
        body: { any: 'data' },
      });

      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 200);
    });
  });

  describe('error format', () => {
    it('includes field path in error', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          user: Type.Object({
            profile: Type.Object({
              age: Type.Integer(),
            }),
          }),
        }),
      });

      const ctx = createContext({
        body: { user: { profile: { age: 'not-a-number' } } },
      });

      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].field.includes('/user/profile/age'));
    });

    it('includes descriptive message', async () => {
      const middleware = createValidationMiddleware({
        body: Type.Object({
          count: Type.Integer({ minimum: 10 }),
        }),
      });

      const ctx = createContext({
        body: { count: 5 },
      });

      const result = await middleware(ctx, successNext);

      assert.strictEqual(result.statusCode, 400);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert.ok((result.body as any).errors[0].message.length > 0);
    });
  });
});
