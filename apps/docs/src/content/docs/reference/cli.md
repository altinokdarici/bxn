---
title: CLI Commands
description: Complete reference for bxn CLI commands
---

The bxn CLI provides a simple command-line interface for running your API in development and production modes.

## Commands

### start

Start the server in production or development mode.

```bash
bxn start [options]
```

**Features:**

- Auto-detects routes directory (`src/routes` or `lib/routes`)
- Runs compiled JavaScript or TypeScript source files
- Optional watch mode using Node.js native `--watch` flag

**Options:**

| Option     | Alias | Type    | Default                                                            | Description                              |
| ---------- | ----- | ------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `--port`   | `-p`  | number  | `3000`                                                             | Port to listen on                        |
| `--routes` | -     | string  | `./src/routes` with `--watch`<br/>`./lib/routes` without `--watch` | Routes directory path                    |
| `--watch`  | -     | boolean | `false`                                                            | Enable watch mode with Node.js --watch   |
| `--key`    | -     | string  | -                                                                  | Path to SSL private key file (for HTTPS) |
| `--cert`   | -     | string  | -                                                                  | Path to SSL certificate file (for HTTPS) |

**Examples:**

```bash
# Basic usage (auto-detects routes)
bxn start

# Development mode with hot reload
bxn start --watch

# Custom port
bxn start --port 8080
bxn start -p 8080

# Development with watch mode and custom port
bxn start --watch --port 8080

# Custom routes directory
bxn start --routes ./dist/routes

# HTTPS in production
bxn start --port 443 --key ./ssl/key.pem --cert ./ssl/cert.pem

# HTTPS in development with watch mode
bxn start --watch --key ./ssl/key.pem --cert ./ssl/cert.pem
```

## HTTPS Support

The `bxn start` command supports HTTPS by providing SSL certificate files.

### Requirements

To enable HTTPS, you must provide both:

- `--key` - Path to your SSL private key file (PEM format)
- `--cert` - Path to your SSL certificate file (PEM format)

Both options must be provided together. If only one is provided, the server will start in HTTP mode.

### Development Setup

For local development, you can generate a self-signed certificate:

```bash
# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem -out cert.pem \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Start server with HTTPS and watch mode
bxn start --watch --key ./key.pem --cert ./cert.pem
```

Your server will be available at `https://localhost:3000`

**Note:** Browsers will show a security warning for self-signed certificates. This is expected for development.

### Production Setup

For production, use certificates from a trusted Certificate Authority (CA):

```bash
# Using Let's Encrypt certificates (example paths)
bxn start \
  --port 443 \
  --key /etc/letsencrypt/live/yourdomain.com/privkey.pem \
  --cert /etc/letsencrypt/live/yourdomain.com/fullchain.pem
```

### Examples

```bash
# Development with HTTPS and watch mode
bxn start --watch --key ./ssl/key.pem --cert ./ssl/cert.pem

# Development with HTTPS on custom port
bxn start --watch --port 3443 --key ./ssl/key.pem --cert ./ssl/cert.pem

# Production with HTTPS
bxn start --port 443 --key ./ssl/key.pem --cert ./ssl/cert.pem

# Production with HTTPS and custom routes
bxn start \
  --port 443 \
  --routes ./dist/routes \
  --key ./ssl/key.pem \
  --cert ./ssl/cert.pem
```

### Path Resolution

Certificate file paths are resolved relative to the current working directory:

```bash
# Relative paths
bxn start --key ./ssl/key.pem --cert ./ssl/cert.pem

# Absolute paths
bxn start --key /etc/ssl/key.pem --cert /etc/ssl/cert.pem
```

### Programmatic HTTPS

You can also configure HTTPS programmatically using the `createServer` API:

```typescript
import { createServer } from '@buildxn/http';
import { readFileSync } from 'fs';

const server = createServer(routes, {
  https: {
    key: readFileSync('./ssl/key.pem'),
    cert: readFileSync('./ssl/cert.pem'),
  },
});

server.listen(443);
```

## Watch Mode

The `--watch` flag uses Node.js native `--watch` feature for automatic server restarts when files change.

**How it works:**

- When you run `bxn start --watch`, the CLI automatically re-spawns itself with `node --watch`
- Node.js watches all imported modules and restarts the server when they change
- No additional configuration or patterns needed

**Example:**

```bash
# Development with auto-reload
bxn start --watch

# With custom port
bxn start --watch --port 8080

# With HTTPS
bxn start --watch --key ./ssl/key.pem --cert ./ssl/cert.pem
```

## Environment Variables

### PORT

Set the default port via environment variable:

```bash
PORT=8080 bxn start
PORT=8080 bxn start --watch
```

**Note:** The `--port` flag takes precedence over the `PORT` environment variable.

## Common Workflows

### Development

```bash
# Start development server with watch mode
pnpm dev
# or
npx bxn start --watch
```

### Production

```bash
# 1. Build your TypeScript code
pnpm build
# or
tsc

# 2. Start production server
pnpm start
# or
npx bxn start
```

### Custom Setup

```bash
# Development with custom configuration
bxn start --watch --port 8080 --routes ./src/api/routes

# Production with custom configuration
bxn start --port 8080 --routes ./dist/api/routes
```

## Configuration via package.json

Add scripts to your `package.json` for convenience:

```json
{
  "scripts": {
    "dev": "bxn start --watch",
    "start": "bxn start",
    "build": "tsc",
    "prod": "npm run build && bxn start"
  }
}
```

Then run:

```bash
npm run dev
npm run start
npm run prod
```

## Routes Directory Selection

The `bxn start` command automatically selects the routes directory based on the `--watch` flag:

- **With `--watch`**: Uses `./src/routes` (development mode with TypeScript source files)
- **Without `--watch`**: Uses `./lib/routes` (production mode with compiled JavaScript)
- **With `--routes`**: Uses the specified path (overrides the default behavior)

This creates a clear contract:

```bash
# Development mode: uses src/routes
bxn start --watch

# Production mode: uses lib/routes (after building)
npm run build
bxn start

# Custom routes directory (overrides default)
bxn start --routes ./custom/routes
bxn start --watch --routes ./custom/routes
```

**Why this design?**

- **Predictable**: You always know which directory is used based on the flag
- **Simple**: No filesystem checks or guessing
- **Best practices**: Enforces the natural workflow (develop in `src/`, run production from `lib/`)

## Examples

### Development with Custom Port

```bash
bxn start --watch --port 8080
```

Your API will be available at `http://localhost:8080`

### Production with Custom Routes

```bash
# After building
tsc

# Run with custom routes directory
bxn start --routes ./dist/api/routes
```

## Troubleshooting

### Port Already in Use

If you get a port conflict error:

```bash
# Use a different port
bxn start --port 3001
```

Or set the PORT environment variable:

```bash
PORT=3001 bxn start
```

### Routes Not Loading

Verify your routes directory:

```bash
# Check if src/routes exists (development)
ls -la ./src/routes

# Check if lib/routes exists (production)
ls -la ./lib/routes

# Or specify custom location
bxn start --routes ./your/routes/path
```

### Watch Mode Not Working

Make sure you're using the `--watch` flag:

```bash
# Correct - enables watch mode
bxn start --watch

# Without --watch, changes won't trigger restarts
bxn start
```

## Next Steps

- Read about [File-System Routing](../../core/file-system-routing/) to understand route structure
- See [Quick Start](../../getting-started/quick-start/) for a complete setup guide
