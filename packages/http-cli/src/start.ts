import { readFileSync } from 'node:fs';
import * as p from '@clack/prompts';
import { createServer } from '@buildxn/http';
import { logRoutes } from './log-routes.ts';
import { discoverRoutes } from './discover-routes.ts';

export interface StartOptions {
  port: number;
  routes?: string;
  sslKey?: string;
  sslCert?: string;
  watch?: boolean;
}

export async function start({ port, routes, sslKey, sslCert, watch }: StartOptions) {
  p.intro('BXN');

  // Show watch mode indicator if running under Node's --watch
  if (watch) {
    p.log.step('Watch mode enabled - server will restart on file changes');
  }

  const routesPath = routes ?? (watch ? 'src/routes' : 'lib/routes');

  try {
    // Validate SSL certificate options
    if ((sslKey && !sslCert) || (!sslKey && sslCert)) {
      p.cancel('Both --ssl-key and --ssl-cert must be provided together for HTTPS');
      process.exit(1);
    }

    // Discover routes for server
    const routes = await discoverRoutes(routesPath);

    // Log discovered routes
    logRoutes(routes, routesPath);

    // Prepare server options
    let httpsOptions = undefined;
    if (sslKey && sslCert) {
      p.log.success('HTTPS enabled');
      httpsOptions = {
        key: readFileSync(sslKey),
        cert: readFileSync(sslCert),
      };
    }

    const s2 = p.spinner();
    s2.start('Starting server');
    const server = createServer(routes, httpsOptions ? { https: httpsOptions } : undefined);
    server.on('error', (err) => {
      p.log.error(`Server error: ${err.message}`);
    });

    const protocol = httpsOptions ? 'https' : 'http';
    server.listen(port, () => {
      s2.stop('Server started successfully');
      p.outro(`${protocol}://localhost:${port}`);
    });
    return server;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      p.cancel(`Routes directory not found: ${routesPath}`);
      process.exit(1);
    }
    throw error;
  }
}
