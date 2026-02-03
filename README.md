<div align="center">

# ⚡ bxn

**A zero-config, file-system-driven HTTP framework for Node.js — type-safe, fast, and minimal.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-25+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10.18.3-orange.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

_Build type-safe REST APIs with zero configuration and convention over configuration_

[Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Examples](#examples) • [Contributing](#contributing)

</div>

---

## 🚀 Quick Start

### Installation

```bash
pnpm create bxn@latest
```

### Create Your First API

1. **Create a route file** - `src/routes/get.ts`:

```typescript
import { route, json } from '@buildxn/http';

export default route().handle(() => {
  return json({
    message: 'Hello, World!',
    timestamp: new Date().toISOString(),
  });
});
```

2. **Run the development server**:

```bash
pnpm dev
```

3. **That's it!** Your API is running at `http://localhost:3000`

## 📖 Documentation

### File-System Routing

Routes are automatically mapped based on your file structure:

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

**Convention**:

- Directories = path segments
- `$` prefix = dynamic parameter (e.g., `$authorId` → `:authorId`)
- Filename = HTTP method (`get.ts`, `post.ts`, `put.ts`, `delete.ts`, etc.)

### Request Handlers

All route files export a default handler using `route()`:

```typescript
import { route, json } from '@buildxn/http';

export default route().handle(() => json({ message: 'Success' }));
```

### Schema Validation

Use `route()` for runtime validation with TypeBox schemas:

```typescript
import { route, json, notFound, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ id: Type.String() }))
  .body(Type.Object({ name: Type.String(), email: Type.String({ format: 'email' }) }))
  .response({
    [StatusCode.Ok]: { body: Type.Object({ id: Type.String(), name: Type.String() }) },
    [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
  })
  .handle((req) => {
    const item = db.get(req.params.id);
    if (!item) return notFound({ error: 'Not found' });
    return json({ id: req.params.id, name: req.body.name });
  });
```

### Type-Safe Parameters & Responses

Get full type safety for path params, query strings, request bodies, **and responses**:

```typescript
import { route, json, notFound, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

const AuthorSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String(),
});

export default route()
  .params(Type.Object({ authorId: Type.String() }))
  .query(Type.Object({ include: Type.Optional(Type.String()) }))
  .response({
    [StatusCode.Ok]: { body: AuthorSchema },
    [StatusCode.NotFound]: { body: Type.Object({ error: Type.String() }) },
  })
  .handle((req) => {
    const { authorId } = req.params; // ✅ Type-safe!
    const { include } = req.query; // ✅ Type-safe!

    const author = db.authors.get(authorId);

    if (!author) {
      return notFound({ error: 'Author not found' }); // ✅ Type-safe!
    }

    return json(author); // ✅ Type-safe!
  });
```

**Benefits of Type-Safe Responses:**

- Catch response type errors at compile time
- Auto-completion for response data structures
- Document all possible response types in the handler signature
- Ensure consistent API contracts

### Response Helpers

Built-in helpers for common HTTP responses with full type safety:

```typescript
import {
  json,        // JSON response with 200
  ok,          // 200 OK (alias for json with 200)
  created,     // 201 Created
  noContent,   // 204 No Content
  badRequest,  // 400 Bad Request
  notFound,    // 404 Not Found
  status,      // Custom status code
  stream,      // Streaming response
  // Type imports for response types
  type Ok,
  type Created,
  type NotFound,
  type BadRequest,
  type NoContent
} from '@buildxn/http';

// JSON response with inferred type
return json({ users: [...] });  // HttpResult<{ users: User[] }>

// Created with location header
return created({ id: '123' }, { Location: '/users/123' });

// Not found with typed error
return notFound({ error: 'User not found' });  // NotFound<{ error: string }>

// Bad request with validation errors
return badRequest({ errors: ['Invalid email'] });  // BadRequest<{ errors: string[] }>

// No content
return noContent();  // NoContent

// Custom status
return status(418);  // HttpResult<void>
```

### Request Body Parsing

Request bodies are automatically parsed based on `Content-Type`:

```typescript
import { route, created } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .body(Type.Object({
    name: Type.String(),
    email: Type.String(),
  }))
  .handle(async (req) => {
    const { name, email } = req.body; // ✅ Parsed and type-safe

    // Validate and process...
    return created({ id: '123' });
  });
```

### CLI Commands

```bash
# Development mode with watch
bxn start --watch

# Production mode
bxn start

# Options:
#   --port, -p <port>    Port to listen on (default: 3000)
#   --routes <path>      Routes directory (auto-detected: src/routes or lib/routes)
#   --watch              Enable watch mode
#   --key <path>         SSL private key (for HTTPS)
#   --cert <path>        SSL certificate (for HTTPS)
```

### HTTPS Support

bxn start supports HTTPS by providing SSL certificate files:

```bash
# Development with HTTPS
bxn start --watch --key ./ssl/key.pem --cert ./ssl/cert.pem

# Production with HTTPS
bxn start --port 443 --key ./ssl/key.pem --cert ./ssl/cert.pem
```

**Generating self-signed certificates for development:**

```bash
# Generate a self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

#### Watch Mode

The `--watch` flag leverages Node.js native `--watch` for automatic server restarts:

```bash
# Enable watch mode
bxn start --watch

# With custom port
bxn start --watch --port 8080
```

**How it works:**

- When you use `--watch`, the CLI re-spawns itself with `node --watch`
- Node.js automatically watches all imported modules
- Server restarts when any file changes
- No configuration needed - works out of the box

#### Routes Directory Selection

The `bxn start` command selects the routes directory based on the `--watch` flag:

- **With `--watch`**: Uses `./src/routes` (development with TypeScript source)
- **Without `--watch`**: Uses `./lib/routes` (production with compiled JavaScript)
- **With `--routes`**: Uses the specified path (explicit override)

This creates a clear, predictable contract with no filesystem guessing.

## 🔧 Configuration

The framework is designed to be zero-config with sensible defaults, but offers flexibility when needed:

### CLI Options

The `bxn start` command supports these options:

| Option     | Alias | Description          | Default                                                                |
| ---------- | ----- | -------------------- | ---------------------------------------------------------------------- |
| `--port`   | `-p`  | Port to listen on    | `3000` (or `PORT` env var)                                             |
| `--routes` | -     | Routes directory     | `./src/routes` (with `--watch`)<br/>`./lib/routes` (without `--watch`) |
| `--watch`  | -     | Enable watch mode    | `false`                                                                |
| `--key`    | -     | SSL private key path | -                                                                      |
| `--cert`   | -     | SSL certificate path | -                                                                      |

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

```bash
# Clone the repo
git clone https://github.com/altinokdarici/bxn.git
cd http

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the example
cd examples/http-minimal
pnpm dev
```

---

<div align="center">

**Built with ❤️ using TypeScript and Node.js**

[Report Bug](https://github.com/altinokdarici/bxn/issues) • [Request Feature](https://github.com/altinokdarici/bxn/issues)

</div>
