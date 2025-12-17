---
title: Streaming Example
description: Learn how to implement streaming responses with bxn
---

bxn has first-class support for streaming responses, perfect for Server-Sent Events (SSE), real-time data feeds, and large file transfers.

## Server-Sent Events (SSE)

Create a real-time event stream that pushes updates to clients:

### Basic SSE Endpoint

```typescript
// src/routes/events/get.ts
import { stream, type RequestHandler } from '@buildxn/http';
import { Readable } from 'node:stream';

const handler: RequestHandler = () => {
  const readable = new Readable({
    read() {
      // This method is called when the client is ready for more data
    },
  });

  // Send an event every second
  const interval = setInterval(() => {
    const data = {
      timestamp: Date.now(),
      message: 'Hello from server!',
    };

    readable.push(`data: ${JSON.stringify(data)}\n\n`);
  }, 1000);

  // Clean up when the client disconnects
  readable.on('close', () => {
    clearInterval(interval);
  });

  return stream(readable, 'text/event-stream', {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
};

export default handler;
```

### Real-Time Updates Example

```typescript
// src/routes/updates/get.ts
import { stream, type RequestHandler } from '@buildxn/http';
import { Readable } from 'node:stream';
import { eventBus } from '../../lib/events';

const handler: RequestHandler = () => {
  const readable = new Readable({
    read() {},
  });

  // Listen to application events
  const onUpdate = (data: any) => {
    readable.push(`event: update\n`);
    readable.push(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onMessage = (data: any) => {
    readable.push(`event: message\n`);
    readable.push(`data: ${JSON.stringify(data)}\n\n`);
  };

  eventBus.on('update', onUpdate);
  eventBus.on('message', onMessage);

  // Send initial connection event
  readable.push(`event: connected\n`);
  readable.push(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

  // Clean up when client disconnects
  readable.on('close', () => {
    eventBus.off('update', onUpdate);
    eventBus.off('message', onMessage);
  });

  return stream(readable, 'text/event-stream', {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering in nginx
  });
};

export default handler;
```

### Client Usage (Browser)

```html
<!DOCTYPE html>
<html>
  <head>
    <title>SSE Example</title>
  </head>
  <body>
    <div id="events"></div>

    <script>
      const eventsDiv = document.getElementById('events');
      const eventSource = new EventSource('http://localhost:3000/events');

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const p = document.createElement('p');
        p.textContent = `${data.timestamp}: ${data.message}`;
        eventsDiv.appendChild(p);
      };

      // Handle custom event types
      eventSource.addEventListener('update', (event) => {
        console.log('Update:', JSON.parse(event.data));
      });

      eventSource.addEventListener('connected', (event) => {
        console.log('Connected:', JSON.parse(event.data));
      });

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
      };
    </script>
  </body>
</html>
```

## File Streaming

Stream large files efficiently:

```typescript
// src/routes/files/$fileId/get.ts
import { stream, notFound, type RequestHandler } from '@buildxn/http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Params = { fileId: string };

const handler: RequestHandler<Params> = (req) => {
  const { fileId } = req.params;
  const filePath = join('/uploads', fileId);

  if (!existsSync(filePath)) {
    return notFound({ error: 'File not found' });
  }

  const stats = statSync(filePath);
  const fileStream = createReadStream(filePath);

  return stream(fileStream, 'application/octet-stream', {
    'Content-Length': stats.size.toString(),
    'Content-Disposition': `attachment; filename="${fileId}"`,
  });
};

export default handler;
```

## CSV Streaming

Generate and stream CSV data:

```typescript
// src/routes/export/users/get.ts
import { stream, type RequestHandler } from '@buildxn/http';
import { Readable } from 'node:stream';
import { db } from '../../../db';

const handler: RequestHandler = () => {
  const users = db.users.getAll();

  const readable = new Readable({
    read() {},
  });

  // Send CSV header
  readable.push('ID,Name,Email,Created At\n');

  // Stream users one by one
  for (const user of users) {
    const row = `${user.id},"${user.name}","${user.email}",${user.createdAt}\n`;
    readable.push(row);
  }

  // End the stream
  readable.push(null);

  return stream(readable, 'text/csv', {
    'Content-Disposition': 'attachment; filename="users.csv"',
  });
};

export default handler;
```

## JSON Lines Streaming

Stream JSON objects line by line:

```typescript
// src/routes/stream/logs/get.ts
import { stream, type RequestHandler } from '@buildxn/http';
import { Readable } from 'node:stream';
import { db } from '../../../db';

const handler: RequestHandler = () => {
  const readable = new Readable({
    read() {},
  });

  // Stream logs as JSON Lines (JSONL)
  const logs = db.logs.getAll();

  for (const log of logs) {
    readable.push(JSON.stringify(log) + '\n');
  }

  readable.push(null);

  return stream(readable, 'application/x-ndjson', {
    'Cache-Control': 'no-cache',
  });
};

export default handler;
```

## Progress Updates

Stream progress updates for long-running tasks:

```typescript
// src/routes/process/$taskId/get.ts
import { stream, notFound, type RequestHandler } from '@buildxn/http';
import { Readable } from 'node:stream';
import { taskManager } from '../../../lib/tasks';

type Params = { taskId: string };

const handler: RequestHandler<Params> = (req) => {
  const { taskId } = req.params;
  const task = taskManager.get(taskId);

  if (!task) {
    return notFound({ error: 'Task not found' });
  }

  const readable = new Readable({
    read() {},
  });

  // Send initial status
  readable.push(
    `data: ${JSON.stringify({
      status: task.status,
      progress: 0,
    })}\n\n`,
  );

  // Listen for progress updates
  task.on('progress', (progress: number) => {
    readable.push(
      `data: ${JSON.stringify({
        status: 'processing',
        progress,
      })}\n\n`,
    );
  });

  task.on('complete', (result: any) => {
    readable.push(
      `data: ${JSON.stringify({
        status: 'complete',
        progress: 100,
        result,
      })}\n\n`,
    );
    readable.push(null);
  });

  task.on('error', (error: Error) => {
    readable.push(
      `data: ${JSON.stringify({
        status: 'error',
        error: error.message,
      })}\n\n`,
    );
    readable.push(null);
  });

  return stream(readable, 'text/event-stream', {
    'Cache-Control': 'no-cache',
  });
};

export default handler;
```

## Backpressure Handling

Handle backpressure when streaming large datasets:

```typescript
// src/routes/stream/data/get.ts
import { stream, type RequestHandler } from '@buildxn/http';
import { Readable } from 'node:stream';
import { db } from '../../../db';

const handler: RequestHandler = () => {
  let cursor = 0;
  const batchSize = 100;

  const readable = new Readable({
    objectMode: false,

    async read() {
      try {
        // Fetch batch of records
        const records = await db.records.getBatch(cursor, batchSize);

        if (records.length === 0) {
          // No more data
          this.push(null);
          return;
        }

        // Push each record
        for (const record of records) {
          const data = JSON.stringify(record) + '\n';

          // Respect backpressure
          if (!this.push(data)) {
            break;
          }
        }

        cursor += records.length;
      } catch (error) {
        this.destroy(error as Error);
      }
    },
  });

  return stream(readable, 'application/x-ndjson');
};

export default handler;
```

## Testing Streaming Endpoints

### Using curl

```bash
# SSE endpoint
curl -N http://localhost:3000/events

# File download
curl http://localhost:3000/files/document.pdf -o document.pdf

# CSV export
curl http://localhost:3000/export/users > users.csv

# JSON Lines
curl http://localhost:3000/stream/logs
```

### Using Node.js

```typescript
import fetch from 'node-fetch';

async function consumeSSE() {
  const response = await fetch('http://localhost:3000/events');
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    const chunk = decoder.decode(value);
    console.log('Received:', chunk);
  }
}

consumeSSE();
```

## Best Practices

1. **Set Appropriate Headers**: Always set `Cache-Control: no-cache` for SSE
2. **Handle Cleanup**: Clean up intervals, listeners, and resources when streams close
3. **Handle Backpressure**: Respect the `push()` return value for large datasets
4. **Error Handling**: Handle and destroy streams on errors
5. **Connection Management**: Monitor and handle client disconnections
6. **Buffering**: Disable proxy buffering with `X-Accel-Buffering: no` header

## Common Use Cases

- **Real-time dashboards**: Live metrics and analytics
- **Chat applications**: Real-time messages
- **Progress tracking**: Long-running task updates
- **Live notifications**: Push notifications to users
- **Data exports**: Large CSV/JSON exports
- **Log streaming**: Real-time log viewing
- **File downloads**: Large file transfers

## Next Steps

- Build a complete [REST API](../../examples/rest-api/)
- Learn about [Response Helpers](../../reference/response-helpers/)
- Explore [Request Handlers](../../core/request-handlers/)
