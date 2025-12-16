import { stream, type RequestHandler } from '@buildxn/http';

type Params = Record<string, never>;

// GET /stream - Server-Sent Events example
const handler: RequestHandler<Params> = () => {
  return stream(async (res) => {
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let count = 0;

    // Send a message every second for 10 seconds
    const interval = setInterval(() => {
      count++;

      // SSE format: data: {message}\n\n
      res.write(
        `data: ${JSON.stringify({
          message: `Event ${count}`,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      );

      if (count >= 10) {
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    // Handle client disconnect
    res.on('close', () => {
      clearInterval(interval);
    });
  });
};

export default handler;
