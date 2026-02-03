# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

bxn is a zero-config, file-system-driven HTTP framework for Node.js with TypeScript.

## Getting Started

```bash
pnpm create bxn@latest
cd my-api
pnpm dev
```

## Development (this repo)

```bash
pnpm install && pnpm build    # Setup
pnpm lint:fix && pnpm format  # Code quality
cd packages/http && pnpm test # Run tests
cd examples/http-minimal && pnpm dev  # Run example
```

## File-System Routing

`src/routes/authors/$authorId/get.ts` → `GET /authors/:authorId`

## Handler

```typescript
import { route, json } from '@buildxn/http';
import { Type } from '@sinclair/typebox';

export default route()
  .params(Type.Object({ id: Type.String() }))
  .handle((ctx) => json({ id: ctx.params.id }));
```

## Middleware

Add `middleware.ts` in any route directory - it applies to all routes in that directory and below.

## Requirements

- Node.js >= 25.0.0
- pnpm 10.18.3
