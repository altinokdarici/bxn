---
title: Request Handlers
description: Learn how to create and work with request handlers in bxn
---

Request handlers are the core building blocks of your bxn API. Each route file exports a default handler function that processes incoming requests and returns responses.

## Basic Handler

All route files export a default handler function with the `RequestHandler` type:

```typescript
import type { RequestHandler } from '@buildxn/http';

const handler: RequestHandler = (req) => {
  // Process request and return response
};

export default handler;
```

## Request Object

The request object (`req`) provides access to all request data:

### Request Properties

```typescript
const handler: RequestHandler = (req) => {
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
};
```

## Request Body Parsing

Request bodies are **automatically parsed** based on the `Content-Type` header:

- `application/json` → Parsed as JSON
- `application/x-www-form-urlencoded` → Parsed as form data
- `multipart/form-data` → Parsed as multipart data
- Other types → Available as raw string

```typescript
type RequestBody = { name: string; email: string };

const handler: RequestHandler<{}, any, RequestBody> = (req) => {
  const { name, email } = req.body; // Automatically parsed and type-safe
  // ...
};
```

## Async Handlers

Handlers can be async functions for working with promises:

```typescript
const handler: RequestHandler = async (req) => {
  const user = await db.users.findById(req.params.userId);
  return json(user);
};
```

## Error Handling

Handlers should return appropriate HTTP responses for errors:

```typescript
import { json, notFound, badRequest, type RequestHandler } from '@buildxn/http';

const handler: RequestHandler = async (req) => {
  try {
    const user = await db.users.get(req.params.userId);

    if (!user) {
      return notFound({ error: 'User not found' });
    }

    return json(user);
  } catch (error) {
    return badRequest({ error: 'Invalid request' });
  }
};
```

## Handler Examples

### Simple GET Request

```typescript
import { json, type RequestHandler } from '@buildxn/http';

const handler: RequestHandler = () => {
  return json({
    message: 'Hello, World!',
    timestamp: new Date().toISOString(),
  });
};

export default handler;
```

### POST with Body

```typescript
import { created, badRequest, type RequestHandler } from '@buildxn/http';

type Body = { title: string; content: string };

const handler: RequestHandler<{}, any, Body> = (req) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return badRequest({ error: 'Missing required fields' });
  }

  const post = db.posts.create({ title, content });
  return created(post, `/posts/${post.id}`);
};

export default handler;
```

### Dynamic Route Handler

```typescript
import { json, notFound, type RequestHandler } from '@buildxn/http';

type Params = { userId: string };
type Query = { include?: string };

const handler: RequestHandler<Params> = (req) => {
  const { userId } = req.params;
  const { include } = req.query;

  const user = db.users.get(userId);

  if (!user) {
    return notFound({ error: 'User not found' });
  }

  return json(user);
};

export default handler;
```

### DELETE Handler

```typescript
import { noContent, notFound, type RequestHandler } from '@buildxn/http';

type Params = { userId: string };

const handler: RequestHandler<Params> = (req) => {
  const { userId } = req.params;
  const deleted = db.users.delete(userId);

  if (!deleted) {
    return notFound({ error: 'User not found' });
  }

  return noContent();
};

export default handler;
```

## Next Steps

- Learn about [Schema Validation](../../core/validation/) for runtime validation with TypeBox
- Learn about [Type Safety](../../core/type-safety/) for full type-safe APIs
- Explore [Response Helpers](../../reference/response-helpers/) for all available response types
