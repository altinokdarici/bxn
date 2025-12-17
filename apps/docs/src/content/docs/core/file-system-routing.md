---
title: File-System Routing
description: Learn how bxn automatically maps your file structure to API routes
---

One of bxn's core features is **file-system based routing** — your directory structure automatically becomes your API structure. No configuration required.

## Basic Routing

Routes are automatically mapped based on your file structure in the `src/routes` directory:

```
src/routes/
├── get.ts                    → GET /
├── authors/
│   ├── get.ts                → GET /authors
│   ├── post.ts               → POST /authors
│   └── $authorId/
│       ├── get.ts            → GET /authors/:authorId
│       └── delete.ts         → DELETE /authors/:authorId
└── posts/
    ├── get.ts                → GET /posts
    └── $postId/
        └── get.ts            → GET /posts/:postId
```

## Convention

### Directories = Path Segments

Each directory in your routes folder becomes a path segment in your API:

- `routes/users/` → `/users`
- `routes/api/v1/` → `/api/v1`

### Filenames = HTTP Methods

The filename determines which HTTP method the route handles:

- `get.ts` → `GET` request
- `post.ts` → `POST` request
- `put.ts` → `PUT` request
- `delete.ts` → `DELETE` request
- `patch.ts` → `PATCH` request

All standard HTTP methods are supported.

### Dynamic Parameters

Use the `$` prefix to create dynamic route parameters:

- `$authorId/` → `:authorId` parameter
- `$postId/` → `:postId` parameter
- `$slug/` → `:slug` parameter

These parameters are accessible in your request handlers via `req.params`.

## Examples

### Simple Endpoint

```typescript
// src/routes/health/get.ts
import { json, type RequestHandler } from '@buildxn/http';

const handler: RequestHandler = () => {
  return json({ status: 'ok' });
};

export default handler;
```

**Maps to:** `GET /health`

### CRUD Operations

```typescript
// src/routes/users/get.ts
import { json, type RequestHandler } from '@buildxn/http';

const handler: RequestHandler = () => {
  return json({ users: db.users.getAll() });
};

export default handler;
```

```typescript
// src/routes/users/post.ts
import { created, type RequestHandler } from '@buildxn/http';

const handler: RequestHandler = (req) => {
  const user = db.users.create(req.body);
  return created(user, `/users/${user.id}`);
};

export default handler;
```

**Maps to:**

- `GET /users`
- `POST /users`

### Dynamic Routes

```typescript
// src/routes/users/$userId/get.ts
import { json, notFound, type RequestHandler } from '@buildxn/http';

type Params = { userId: string };

const handler: RequestHandler<Params> = (req) => {
  const user = db.users.get(req.params.userId);

  if (!user) {
    return notFound({ error: 'User not found' });
  }

  return json(user);
};

export default handler;
```

**Maps to:** `GET /users/:userId`

### Nested Dynamic Routes

```typescript
// src/routes/users/$userId/posts/$postId/get.ts
import { json, notFound, type RequestHandler } from '@buildxn/http';

type Params = { userId: string; postId: string };

const handler: RequestHandler<Params> = (req) => {
  const { userId, postId } = req.params;
  const post = db.posts.getByUserAndId(userId, postId);

  if (!post) {
    return notFound({ error: 'Post not found' });
  }

  return json(post);
};

export default handler;
```

**Maps to:** `GET /users/:userId/posts/:postId`

## Benefits

- **Intuitive**: Your file structure mirrors your API structure
- **Discoverable**: Easy to navigate and understand the codebase
- **Type-Safe**: TypeScript knows the exact parameter names from the file structure
- **No Config**: No routing configuration files needed
- **Scalable**: Organize routes naturally as your API grows
