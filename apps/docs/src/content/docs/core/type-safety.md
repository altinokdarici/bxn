---
title: Type Safety
description: End-to-end type safety for your bxn http APIs
---

bxn http provides **full TypeScript support** with end-to-end type safety for all aspects of your API — from request parameters to response bodies.

## RequestHandler Type

The `RequestHandler` type accepts generic parameters for complete type safety:

```typescript
type RequestHandler<
  Params = {},      // Path parameters
  Response = any,   // Response types
  Body = any,       // Request body
  Query = {}        // Query parameters
>
```

## Type-Safe Parameters

Define types for path parameters from your dynamic routes:

```typescript
import { json, notFound, type RequestHandler } from '@buildxn/http';

type Params = { userId: string };

const handler: RequestHandler<Params> = (req) => {
  const { userId } = req.params; // ✅ Type-safe! TypeScript knows userId exists

  const user = db.users.get(userId);

  if (!user) {
    return notFound({ error: 'User not found' });
  }

  return json(user);
};

export default handler;
```

## Type-Safe Query Parameters

Define types for query string parameters:

```typescript
import { json, type RequestHandler } from '@buildxn/http';

type Params = { userId: string };
type Query = { include?: string; page?: string };

const handler: RequestHandler<Params, any, any, Query> = (req) => {
  const { userId } = req.params;
  const { include, page } = req.query; // ✅ Type-safe!

  // TypeScript knows include and page exist and are strings

  return json({ userId, include, page });
};
```

## Type-Safe Request Bodies

Define types for request body data:

```typescript
import { created, badRequest, type RequestHandler } from '@buildxn/http';

type Body = {
  name: string;
  email: string;
  age?: number;
};

const handler: RequestHandler<{}, any, Body> = (req) => {
  const { name, email, age } = req.body; // ✅ Type-safe!

  if (!name || !email) {
    return badRequest({ error: 'Missing required fields' });
  }

  const user = db.users.create({ name, email, age });
  return created(user);
};
```

## Type-Safe Responses

This is where bxn http really shines! Define **all possible response types** in your handler signature:

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

type Params = { userId: string };

interface User {
  id: string;
  name: string;
  email: string;
}

// Define ALL possible response types
type Response = Ok<User> | NotFound<{ error: string }> | BadRequest<{ error: string }>;

const handler: RequestHandler<Params, Response> = (req): Response => {
  const { userId } = req.params;

  if (!isValidId(userId)) {
    return badRequest({ error: 'Invalid user ID' }); // ✅ Type-safe!
  }

  const user = db.users.get(userId);

  if (!user) {
    return notFound({ error: 'User not found' }); // ✅ Type-safe!
  }

  return json(user); // ✅ Type-safe!
};

export default handler;
```

## Response Type Helpers

bxn http provides type helpers for all HTTP responses:

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

### Ok<T>

Type for successful JSON responses (200 OK):

```typescript
type Response = Ok<{ users: User[] }>;

const handler: RequestHandler<{}, Response> = () => {
  return json({ users: db.users.getAll() }); // ✅ Type-safe!
};
```

### Created<T>

Type for created resources (201 Created):

```typescript
type Response = Created<User>;

const handler: RequestHandler<{}, Response, CreateUserBody> = (req) => {
  const user = db.users.create(req.body);
  return created(user, `/users/${user.id}`); // ✅ Type-safe!
};
```

### NotFound<T>

Type for not found responses (404 Not Found):

```typescript
type Response = Ok<User> | NotFound<{ error: string }>;

const handler: RequestHandler<Params, Response> = (req) => {
  const user = db.users.get(req.params.userId);

  if (!user) {
    return notFound({ error: 'User not found' }); // ✅ Type-safe!
  }

  return json(user); // ✅ Type-safe!
};
```

### BadRequest<T>

Type for bad request responses (400 Bad Request):

```typescript
type Response = Created<User> | BadRequest<{ errors: string[] }>;

const handler: RequestHandler<{}, Response, Body> = (req) => {
  const errors = validate(req.body);

  if (errors.length > 0) {
    return badRequest({ errors }); // ✅ Type-safe!
  }

  const user = db.users.create(req.body);
  return created(user); // ✅ Type-safe!
};
```

### NoContent

Type for no content responses (204 No Content):

```typescript
type Response = NoContent | NotFound<{ error: string }>;

const handler: RequestHandler<Params, Response> = (req) => {
  const deleted = db.users.delete(req.params.userId);

  if (!deleted) {
    return notFound({ error: 'User not found' });
  }

  return noContent(); // ✅ Type-safe!
};
```

## Complete Example

Here's a complete example showing full type safety:

```typescript
import {
  json,
  created,
  notFound,
  badRequest,
  type RequestHandler,
  type Ok,
  type Created,
  type NotFound,
  type BadRequest,
} from '@buildxn/http';

// Domain types
interface User {
  id: string;
  name: string;
  email: string;
}

type Params = { userId: string };

type Query = {
  include?: 'posts' | 'comments';
};

type UpdateBody = {
  name?: string;
  email?: string;
};

// Response types
type GetResponse = Ok<User> | NotFound<{ error: string }>;

type UpdateResponse = Ok<User> | NotFound<{ error: string }> | BadRequest<{ errors: string[] }>;

// GET handler
const getHandler: RequestHandler<Params, GetResponse, any, Query> = (req): GetResponse => {
  const { userId } = req.params;
  const { include } = req.query;

  const user = db.users.get(userId);

  if (!user) {
    return notFound({ error: 'User not found' });
  }

  return json(user);
};

// PUT handler
const updateHandler: RequestHandler<Params, UpdateResponse, UpdateBody> = (req): UpdateResponse => {
  const { userId } = req.params;
  const { name, email } = req.body;

  const errors: string[] = [];

  if (name && name.length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (email && !isValidEmail(email)) {
    errors.push('Invalid email address');
  }

  if (errors.length > 0) {
    return badRequest({ errors });
  }

  const user = db.users.update(userId, { name, email });

  if (!user) {
    return notFound({ error: 'User not found' });
  }

  return json(user);
};
```

## Benefits of Type-Safe Responses

1. **Compile-time safety**: Catch response type errors during development
2. **Auto-completion**: Get IntelliSense for response data structures
3. **Documentation**: Handler signatures document all possible responses
4. **Refactoring**: Safely refactor response types across your codebase
5. **API contracts**: Ensure consistent API contracts with TypeScript

## Next Steps

- See all [Response Helpers](../../reference/response-helpers/) available
- Check out complete [Examples](../../examples/rest-api/)
