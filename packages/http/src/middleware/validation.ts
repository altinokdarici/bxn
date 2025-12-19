import Ajv from 'ajv';
import type { TSchema } from '@sinclair/typebox';
import type { Middleware } from '../types';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, coerceTypes: true });
addFormats(ajv);

interface ValidationError {
  field: string;
  message: string;
}

export function createValidationMiddleware(schema: {
  params?: TSchema | undefined;
  query?: TSchema | undefined;
  headers?: TSchema | undefined;
  body?: TSchema | undefined;
}): Middleware {
  const validators: {
    params?: ReturnType<typeof ajv.compile>;
    query?: ReturnType<typeof ajv.compile>;
    headers?: ReturnType<typeof ajv.compile>;
    body?: ReturnType<typeof ajv.compile>;
  } = {};

  // TypeBox schemas are valid JSON Schema
  if (schema.params) validators.params = ajv.compile(schema.params);
  if (schema.query) validators.query = ajv.compile(schema.query);
  if (schema.headers) validators.headers = ajv.compile(schema.headers);
  if (schema.body) validators.body = ajv.compile(schema.body);

  return (ctx, next) => {
    const errors: ValidationError[] = [];

    if (validators.params && !validators.params(ctx.params)) {
      errors.push(
        ...validators.params.errors!.map((e) => ({
          field: `params${e.instancePath}`,
          message: e.message ?? 'Invalid',
        })),
      );
    }

    if (validators.query && !validators.query(ctx.query)) {
      errors.push(
        ...validators.query.errors!.map((e) => ({
          field: `query${e.instancePath}`,
          message: e.message ?? 'Invalid',
        })),
      );
    }

    if (validators.headers && !validators.headers(ctx.headers)) {
      errors.push(
        ...validators.headers.errors!.map((e) => ({
          field: `headers${e.instancePath}`,
          message: e.message ?? 'Invalid',
        })),
      );
    }

    if (validators.body && !validators.body(ctx.body)) {
      errors.push(
        ...validators.body.errors!.map((e) => ({
          field: `body${e.instancePath}`,
          message: e.message ?? 'Invalid',
        })),
      );
    }

    if (errors.length > 0) {
      return {
        statusCode: 400,
        body: { errors },
        headers: {},
      };
    }

    return next(ctx);
  };
}
