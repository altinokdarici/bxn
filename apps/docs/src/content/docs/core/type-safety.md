---
title: Type Safety
description: End-to-end type safety for your bxn APIs
---

bxn provides **full TypeScript support** with end-to-end type safety for all aspects of your API — from request parameters to response bodies.

## Route Builder Type Safety

The `route()` builder provides progressive type inference through method chaining. Each method (`.params()`, `.query()`, `.body()`, `.response()`) enriches the type context for subsequent methods and the final handler.

## Type-Safe Parameters

Define schemas for path parameters using TypeBox:

```typescript
import { route, json, notFound } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ userId: Type.String() }))
  .handle((req) => {
    const { userId } = req.params; // ✅ Type-safe! TypeScript knows userId is a string

    const user = db.users.get(userId);

    if (!user) {
      return notFound({ error: 'User not found' });
    }

    return json(user);
  });
```

## Type-Safe Query Parameters

Chain `.query()` to add type-safe query parameters:

```typescript
import { route, json } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ userId: Type.String() }))
  .query(
    Type.Object({
      include: Type.Optional(Type.String()),
      page: Type.Optional(Type.String()),
    }),
  )
  .handle((req) => {
    const { userId } = req.params;
    const { include, page } = req.query; // ✅ Type-safe!

    // TypeScript knows include and page are strings | undefined

    return json({ userId, include, page });
  });
```

## Type-Safe Request Bodies

Chain `.body()` to add type-safe request body validation:

```typescript
import { route, created, badRequest } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .body(
    Type.Object({
      name: Type.String(),
      email: Type.String(),
      age: Type.Optional(Type.Integer()),
    }),
  )
  .handle((req) => {
    const { name, email, age } = req.body; // ✅ Type-safe!

    if (!name || !email) {
      return badRequest({ error: 'Missing required fields' });
    }

    const user = db.users.create({ name, email, age });
    return created(user);
  });
```

## Type-Safe Responses

This is where bxn really shines! Define **all possible response types** using the `.response()` method:

```typescript
import { route, json, notFound, badRequest, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String(),
});

export default route()
  .params(Type.Object({ userId: Type.String() }))
  .response({
    [StatusCode.Ok]: { body: UserSchema },
    [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
    [StatusCode.BadRequest]: { body: Type.Object({ error: Type.String() }) },
  })
  .handle((req) => {
    const { userId } = req.params;

    if (!isValidId(userId)) {
      return badRequest({ error: 'Invalid user ID' }); // ✅ Type-safe!
    }

    const user = db.users.get(userId);

    if (!user) {
      return notFound({ error: 'User not found' }); // ✅ Type-safe!
    }

    return json(user); // ✅ Type-safe!
  });
```

## Response Schemas

Define response schemas using the `.response()` method with StatusCode keys:

### 200 OK

Successful JSON responses:

```typescript
export default route()
  .response({
    [StatusCode.Ok]: { body: Type.Object({ users: Type.Array(UserSchema) }) },
  })
  .handle(() => {
    return json({ users: db.users.getAll() }); // ✅ Type-safe!
  });
```

### 201 Created

Created resources:

```typescript
export default route()
  .body(
    Type.Object({
      name: Type.String(),
      email: Type.String(),
    }),
  )
  .response({
    [StatusCode.Created]: { body: UserSchema },
  })
  .handle((req) => {
    const user = db.users.create(req.body);
    return created(user, `/users/${user.id}`); // ✅ Type-safe!
  });
```

### 404 Not Found

Not found responses:

```typescript
export default route()
  .params(Type.Object({ userId: Type.String() }))
  .response({
    [StatusCode.Ok]: { body: UserSchema },
    [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
  })
  .handle((req) => {
    const user = db.users.get(req.params.userId);

    if (!user) {
      return notFound({ error: 'User not found' }); // ✅ Type-safe!
    }

    return json(user); // ✅ Type-safe!
  });
```

### 400 Bad Request

Bad request responses:

```typescript
export default route()
  .body(
    Type.Object({
      name: Type.String(),
      email: Type.String(),
    }),
  )
  .response({
    [StatusCode.Created]: { body: UserSchema },
    [StatusCode.BadRequest]: { body: Type.Object({ errors: Type.Array(Type.String()) }) },
  })
  .handle((req) => {
    const errors = validate(req.body);

    if (errors.length > 0) {
      return badRequest({ errors }); // ✅ Type-safe!
    }

    const user = db.users.create(req.body);
    return created(user); // ✅ Type-safe!
  });
```

### 204 No Content

No content responses:

```typescript
export default route()
  .params(Type.Object({ userId: Type.String() }))
  .response({
    [StatusCode.NoContent]: {},
    [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
  })
  .handle((req) => {
    const deleted = db.users.delete(req.params.userId);

    if (!deleted) {
      return notFound({ error: 'User not found' });
    }

    return noContent(); // ✅ Type-safe!
  });
```

## Complete Example

Here's a complete example showing full type safety with the route builder:

```typescript
import { route, json, notFound, badRequest, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

// Schemas
const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String(),
});

// GET /users/:userId - Get user with optional includes
export const getUser = route()
  .params(Type.Object({ userId: Type.String() }))
  .query(
    Type.Object({
      include: Type.Optional(Type.Union([Type.Literal('posts'), Type.Literal('comments')])),
    }),
  )
  .response({
    [StatusCode.Ok]: { body: UserSchema },
    [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
  })
  .handle((req) => {
    const { userId } = req.params;
    const { include } = req.query;

    const user = db.users.get(userId);

    if (!user) {
      return notFound({ error: 'User not found' });
    }

    return json(user);
  });

// PUT /users/:userId - Update user
export const updateUser = route()
  .params(Type.Object({ userId: Type.String() }))
  .body(
    Type.Object({
      name: Type.Optional(Type.String()),
      email: Type.Optional(Type.String()),
    }),
  )
  .response({
    [StatusCode.Ok]: { body: UserSchema },
    [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
    [StatusCode.BadRequest]: { body: Type.Object({ errors: Type.Array(Type.String()) }) },
  })
  .handle((req) => {
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
  });
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
