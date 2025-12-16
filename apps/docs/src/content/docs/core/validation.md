---
title: Schema Validation
description: Runtime validation with JSON Schema and TypeBox
---

Use `handle()` for runtime request validation with full type inference.

## Basic Usage

```typescript
import { handle, json, notFound, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default handle(
  {
    params: Type.Object({ id: Type.String() }),
    body: Type.Object({
      name: Type.String(),
      email: Type.String({ format: 'email' }),
    }),
    response: {
      [StatusCode.Ok]: { body: Type.Object({ id: Type.String(), name: Type.String() }) },
      [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
    },
  },
  (req) => {
    // req.params and req.body are fully typed
    const item = db.get(req.params.id);
    if (!item) return notFound({ error: 'Not found' });
    return json({ id: req.params.id, name: req.body.name });
  },
);
```

## Config Options

| Option     | Description                     |
| ---------- | ------------------------------- |
| `params`   | URL path parameters schema      |
| `query`    | Query string parameters schema  |
| `body`     | Request body schema             |
| `headers`  | Request headers schema          |
| `response` | Response schemas by status code |

## Validation Errors

Invalid requests return 400 with details:

```json
{
  "error": "Validation Failed",
  "details": [
    {
      "field": "body",
      "errors": [{ "path": "/email", "message": "must match format \"email\"", "keyword": "format" }]
    }
  ]
}
```

## Content-Type Based Validation

Different schemas for different content types:

```typescript
import { handle, json, contentType } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default handle(
  {
    body: contentType({
      'application/json': Type.Object({ data: Type.String() }),
      'application/x-www-form-urlencoded': Type.Object({ field: Type.String() }),
    }),
  },
  (req) => json({ received: req.body }),
);
```

Body type is inferred as a union of all content-type schemas.

## Headers Validation

```typescript
export default handle(
  {
    headers: Type.Object({
      'x-api-key': Type.String({ minLength: 1 }),
      'x-request-id': Type.Optional(Type.String()),
    }),
  },
  (req) => {
    const apiKey = req.headers['x-api-key'];
    return json({ authenticated: true });
  },
);
```

## Query Parameters

```typescript
export default handle(
  {
    query: Type.Object({
      page: Type.Optional(Type.Number({ default: 1 })),
      limit: Type.Optional(Type.Number({ default: 10 })),
    }),
  },
  (req) => {
    // query.page and query.limit are typed as numbers
    return json({ page: req.query.page, limit: req.query.limit });
  },
);
```

## AJV Configuration

The built-in AJV instance is configured with:

- `allErrors: true` - collect all validation errors
- `coerceTypes: true` - convert strings to numbers/booleans
- `useDefaults: true` - apply schema defaults
- `removeAdditional: true` - strip unknown properties

## TypeBox

[TypeBox](https://github.com/sinclairzx81/typebox) provides type-safe schema definitions. Install it:

```bash
pnpm add @sinclair/typebox
```

TypeBox schemas compile to standard JSON Schema and provide full TypeScript inference via `Static<typeof schema>`.
