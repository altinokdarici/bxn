import { handle, sse } from '@buildxn/http';

export default handle({
  handler: () =>
    sse((write, close) => {
      let count = 0;

      const interval = setInterval(() => {
        count++;

        write({
          message: `Event ${count}`,
          timestamp: new Date().toISOString(),
        });

        if (count >= 10) {
          clearInterval(interval);
          close();
        }
      }, 1000);

      // Return cleanup for client disconnect
      return () => {
        clearInterval(interval);
      };
    }),
});
