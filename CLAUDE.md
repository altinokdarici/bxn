# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

bxn is a zero-config, file-system-driven HTTP framework for Node.js with TypeScript. It uses convention over configuration where the directory structure defines the API routes.

## Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Lint
pnpm lint
pnpm lint:fix

# Format
pnpm format
pnpm format:check

# Run the example app
cd examples/http-minimal
pnpm dev          # Development with watch mode (uses src/routes)
pnpm start        # Production mode (uses lib/routes)
pnpm build        # Compile TypeScript
```

## Monorepo Structure

This is a pnpm workspace monorepo with:

- `packages/http` - Core HTTP framework (`@buildxn/http`)
- `packages/http-cli` - CLI implementation for the `start` command (`@buildxn/http-cli`)
- `packages/cli` - Main CLI entry point that bundles commands (`bxn`)
- `packages/create-bxn` - Project scaffolding tool (`create-bxn`)
- `apps/docs` - Astro-based documentation site
- `examples/http-minimal` - Example application

## Architecture

### File-System Routing Convention

Routes are discovered from the file system:

- Directory names become path segments
- `$` prefix creates dynamic parameters (`$authorId` → `:authorId`)
- File names are HTTP methods (`get.ts`, `post.ts`, `put.ts`, `delete.ts`)

Example: `src/routes/authors/$authorId/get.ts` → `GET /authors/:authorId`

### Package Relationships

1. **@buildxn/http** (`packages/http`): Core library with `createServer()`, response helpers (`json`, `ok`, `notFound`, etc.), and the `handle()` validation wrapper using AJV
2. **@buildxn/http-cli** (`packages/http-cli`): Implements `start` command with route discovery (`discoverRoutes`) and server startup logic
3. **bxn** (`packages/cli`): Entry point CLI that registers commands from `@buildxn/http-cli` using cac
4. **create-bxn** (`packages/create-bxn`): Standalone scaffolding tool

### Key Files

- `packages/http/src/create-server.ts` - Server factory, request handling, route matching
- `packages/http/src/http-result.ts` - Response helpers and status codes
- `packages/http/src/handle.ts` - Schema validation with AJV and TypeBox support
- `packages/http-cli/src/discover-routes.ts` - File-system route discovery
- `packages/http-cli/src/start.ts` - CLI start command implementation

### Route Handler Pattern

Handlers export a default function returning an `HttpResult`:

```typescript
import { json, type RequestHandler } from '@buildxn/http';

const handler: RequestHandler = (req) => {
  return json({ message: 'Hello' });
};

export default handler;
```

### Validation Pattern

Use `handle()` for runtime validation with TypeBox schemas:

```typescript
import { handle, json, StatusCode } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default handle(
  {
    params: Type.Object({ id: Type.String() }),
    body: Type.Object({ name: Type.String() }),
    response: {
      [StatusCode.Ok]: { body: Type.Object({ id: Type.String() }) },
    },
  },
  (req) => json({ id: req.params.id }),
);
```

## Requirements

- Node.js >= 25.0.0
- pnpm 10.18.3
