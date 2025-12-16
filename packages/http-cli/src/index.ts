import type { CAC } from 'cac';
import type { StartOptions } from './start';
import { spawn } from 'node:child_process';

export function registerHttpCommands(cli: CAC) {
  cli
    .command('start', 'start server')
    .option('-p, --port <number>', 'Port to run the server on', { default: '3000' })
    .option('--watch', 'Enable watch mode')
    .option('--routes <path>', 'Path to the routes directory')
    .option('--ssl-key <path>', 'Path to the SSL key file')
    .option('--ssl-cert <path>', 'Path to the SSL certificate file')
    .action(async (options: StartOptions) => {
      if (options.watch && !process.env['NODE_RUN_WATCH_MODE']) {
        // Restart with Node.js --watch flag (only if not already in watch mode)
        const args = ['--watch', ...process.argv.slice(1).filter((arg) => arg !== '--watch')];
        spawn(process.execPath, args, {
          stdio: 'inherit',
          env: {
            ...process.env,
            NODE_RUN_WATCH_MODE: '1',
          },
        });
      } else {
        // Normal mode (or already running under --watch)
        const { start } = await import('./start.ts');
        // Pass watch=true if NODE_RUN_WATCH_MODE is set
        const watch = !!process.env['NODE_RUN_WATCH_MODE'];
        await start({
          ...options,
          watch,
        });
      }
    });
}
