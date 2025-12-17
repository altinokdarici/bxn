---
title: Response Helpers
description: Complete reference for all bxn http response helpers
---

bxn provides built-in helper functions for creating HTTP responses with full type safety.

## json()

Returns a JSON response with status 200 OK.

```typescript
import { json } from '@buildxn/http';

json(data: T, headers?: Record<string, string>): Ok<T>
```

### Examples

```typescript
// Simple JSON response
return json({ message: 'Success' });

// With custom headers
return json(
  { users: [...] },
  { 'Cache-Control': 'max-age=3600' }
);

// Type-safe response
interface User { id: string; name: string }
return json<User[]>([...users]);  // Ok<User[]>
```

## ok()

Alias for `json()` with status 200 OK.

```typescript
import { ok } from '@buildxn/http';

ok(data: T, headers?: Record<string, string>): Ok<T>
```

### Example

```typescript
return ok({ status: 'healthy' });
```

## created()

Returns a 201 Created response with optional Location header.

```typescript
import { created } from '@buildxn/http';

created(
  data: T,
  location?: string,
  headers?: Record<string, string>
): Created<T>
```

### Examples

```typescript
// Created with location
const user = db.users.create(req.body);
return created(user, `/users/${user.id}`);

// Created with custom headers
return created({ id: '123' }, '/users/123', { 'X-Request-ID': 'abc123' });
```

## noContent()

Returns a 204 No Content response (empty body).

```typescript
import { noContent } from '@buildxn/http';

noContent(headers?: Record<string, string>): NoContent
```

### Example

```typescript
// After successful DELETE
db.users.delete(userId);
return noContent();

// With custom headers
return noContent({ 'X-Deleted-Count': '1' });
```

## badRequest()

Returns a 400 Bad Request response.

```typescript
import { badRequest } from '@buildxn/http';

badRequest(
  data: T,
  headers?: Record<string, string>
): BadRequest<T>
```

### Examples

```typescript
// Simple error
return badRequest({ error: 'Invalid input' });

// Validation errors
return badRequest({
  errors: ['Name is required', 'Email must be valid'],
});

// With custom headers
return badRequest({ error: 'Invalid token' }, { 'WWW-Authenticate': 'Bearer' });
```

## notFound()

Returns a 404 Not Found response.

```typescript
import { notFound } from '@buildxn/http';

notFound(
  data: T,
  headers?: Record<string, string>
): NotFound<T>
```

### Examples

```typescript
// Simple not found
return notFound({ error: 'User not found' });

// With details
return notFound({
  error: 'Resource not found',
  resource: 'user',
  id: userId,
});

// With custom headers
return notFound({ error: 'Page not found' }, { 'X-Reason': 'deleted' });
```

## status()

Returns a response with a custom HTTP status code.

```typescript
import { status } from '@buildxn/http';

status(
  code: number,
  data?: T,
  headers?: Record<string, string>
): HttpResult<T>
```

### Examples

```typescript
// Custom status code
return status(418); // I'm a teapot

// With data
return status(429, { error: 'Too many requests' });

// With headers
return status(503, { error: 'Service unavailable' }, { 'Retry-After': '60' });

// Common custom status codes
return status(401, { error: 'Unauthorized' });
return status(403, { error: 'Forbidden' });
return status(409, { error: 'Conflict' });
return status(422, { error: 'Unprocessable Entity' });
return status(500, { error: 'Internal Server Error' });
```

## stream()

Returns a streaming response for real-time data.

```typescript
import { stream } from '@buildxn/http';
import type { Readable } from 'node:stream';

stream(
  readable: Readable,
  contentType?: string,
  headers?: Record<string, string>
): HttpResult<Readable>
```

### Examples

```typescript
import { stream } from '@buildxn/http';
import { Readable } from 'node:stream';

// Server-Sent Events
const readable = new Readable({
  read() {
    this.push(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
  },
});

return stream(readable, 'text/event-stream');

// File streaming
const fileStream = fs.createReadStream('large-file.json');
return stream(fileStream, 'application/json');

// Custom headers
return stream(readable, 'text/event-stream', { 'Cache-Control': 'no-cache' });
```

## Response Types

All response helpers return typed results that can be used in your handler signatures:

```typescript
import type {
  Ok, // 200 OK
  Created, // 201 Created
  NoContent, // 204 No Content
  BadRequest, // 400 Bad Request
  NotFound, // 404 Not Found
  HttpResult, // Generic response type
} from '@buildxn/http';
```

### Usage Example

```typescript
import {
  json,
  notFound,
  badRequest,
  type RequestHandler,
  type Ok,
  type NotFound,
  type BadRequest,
} from '@buildxn/http';

type Response = Ok<User> | NotFound<{ error: string }> | BadRequest<{ errors: string[] }>;

const handler: RequestHandler<Params, Response> = (req): Response => {
  // TypeScript enforces that you can only return these types
  if (validationErrors.length > 0) {
    return badRequest({ errors: validationErrors });
  }

  const user = db.users.get(req.params.userId);

  if (!user) {
    return notFound({ error: 'User not found' });
  }

  return json(user);
};
```

## Custom Headers

All response helpers accept an optional `headers` parameter:

```typescript
// CORS headers
return json(
  { data: [...] },
  {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  }
);

// Caching headers
return json(
  { users: [...] },
  {
    'Cache-Control': 'public, max-age=3600',
    'ETag': '"abc123"'
  }
);

// Security headers
return json(
  { data: [...] },
  {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  }
);
```

## Complete Example

```typescript
import {
  json,
  created,
  noContent,
  notFound,
  badRequest,
  type RequestHandler,
  type Ok,
  type Created,
  type NoContent,
  type NotFound,
  type BadRequest,
} from '@buildxn/http';

// GET /users/:userId
type GetResponse = Ok<User> | NotFound<{ error: string }>;

const get: RequestHandler<Params, GetResponse> = (req) => {
  const user = db.users.get(req.params.userId);

  if (!user) {
    return notFound({ error: 'User not found' });
  }

  return json(user);
};

// POST /users
type PostResponse = Created<User> | BadRequest<{ errors: string[] }>;

const post: RequestHandler<{}, PostResponse, CreateUserBody> = (req) => {
  const errors = validate(req.body);

  if (errors.length > 0) {
    return badRequest({ errors });
  }

  const user = db.users.create(req.body);
  return created(user, `/users/${user.id}`);
};

// DELETE /users/:userId
type DeleteResponse = NoContent | NotFound<{ error: string }>;

const del: RequestHandler<Params, DeleteResponse> = (req) => {
  const deleted = db.users.delete(req.params.userId);

  if (!deleted) {
    return notFound({ error: 'User not found' });
  }

  return noContent();
};
```

## Next Steps

- Learn about [Type Safety](../../core/type-safety/) for type-safe responses
- See [Examples](../../examples/rest-api/) for complete API implementations
