---
title: Request Handlers
description: Learn how to create and work with request handlers in bxn
---

Request handlers are the core building blocks of your bxn API. Each route file exports a default route using the `route()` builder that processes incoming requests and returns responses.

## Basic Handler

All route files use the `route()` builder to define handlers:

```typescript
import { route, json } from '@buildxn/http';

export default route().handle((req) => {
  // Process request and return response
  return json({ message: 'Success' });
});
```

## Request Object

The request object (`req`) provides access to all request data:

### Request Properties

```typescript
export default route().handle((req) => {
  // Path parameters (from dynamic routes)
  const params = req.params; // { userId: '123' }

  // Query string parameters
  const query = req.query; // { page: '1', limit: '10' }

  // Request body (automatically parsed)
  const body = req.body; // { name: 'John', email: 'john@example.com' }

  // HTTP headers
  const headers = req.headers;

  // Request method
  const method = req.method; // 'GET', 'POST', etc.

  // Request URL
  const url = req.url;

  // Node.js IncomingMessage
  const raw = req.raw; // Access to underlying Node.js request

  return json({ method, path: url });
});
```

## Request Body Parsing

Request bodies are **automatically parsed** based on the `Content-Type` header:

- `application/json` → Parsed as JSON
- `application/x-www-form-urlencoded` → Parsed as form data
- `multipart/form-data` → Parsed as multipart data
- Other types → Available as raw string

```typescript
import { route, json } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .body(Type.Object({
    name: Type.String(),
    email: Type.String(),
  }))
  .handle((req) => {
    const { name, email } = req.body; // Automatically parsed and type-safe
    return json({ name, email });
  });
```

## Async Handlers

Handlers can be async functions for working with promises:

```typescript
import { route, json } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ userId: Type.String() }))
  .handle(async (req) => {
    const user = await db.users.findById(req.params.userId);
    return json(user);
  });
```

## Error Handling

Handlers should return appropriate HTTP responses for errors:

```typescript
import { route, json, notFound, badRequest } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ userId: Type.String() }))
  .handle(async (req) => {
    try {
      const user = await db.users.get(req.params.userId);

      if (!user) {
        return notFound({ error: 'User not found' });
      }

      return json(user);
    } catch (error) {
      return badRequest({ error: 'Invalid request' });
    }
  });
```

## Handler Examples

### Simple GET Request

```typescript
import { route, json } from '@buildxn/http';

export default route().handle(() => {
  return json({
    message: 'Hello, World!',
    timestamp: new Date().toISOString(),
  });
});
```

### POST with Body

```typescript
import { route, created, badRequest } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .body(Type.Object({
    title: Type.String(),
    content: Type.String(),
  }))
  .handle((req) => {
    const { title, content } = req.body;

    if (!title || !content) {
      return badRequest({ error: 'Missing required fields' });
    }

    const post = db.posts.create({ title, content });
    return created(post, `/posts/${post.id}`);
  });
```

### Dynamic Route Handler

```typescript
import { route, json, notFound } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ userId: Type.String() }))
  .query(Type.Object({
    include: Type.Optional(Type.String()),
  }))
  .handle((req) => {
    const { userId } = req.params;
    const { include } = req.query;

    const user = db.users.get(userId);

    if (!user) {
      return notFound({ error: 'User not found' });
    }

    return json(user);
  });
```

### DELETE Handler

```typescript
import { route, noContent, notFound } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ userId: Type.String() }))
  .handle((req) => {
    const { userId } = req.params;
    const deleted = db.users.delete(userId);

    if (!deleted) {
      return notFound({ error: 'User not found' });
    }

    return noContent();
  });
```

## Next Steps

- Learn about [Schema Validation](../../core/validation/) for runtime validation with TypeBox
- Learn about [Type Safety](../../core/type-safety/) for full type-safe APIs
- Explore [Response Helpers](../../reference/response-helpers/) for all available response types
