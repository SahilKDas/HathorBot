import { createServer } from 'node:http';
import { handleDeveloperDashboard } from './DeveloperDashboard.js';

function writeJson(response, statusCode, payload, { pretty = false } = {}) {
  const body = JSON.stringify(payload, null, pretty ? 2 : 0);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

export function isLoopback(address = '') {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  return normalized === '::1' || normalized === 'localhost' || normalized.startsWith('127.');
}

export function startHealthServer({ client, database, audit, host, port }) {
  const server = createServer((request, response) => {
    void (async () => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;

    if (pathname === '/data') {
      if (!isLoopback(request.socket.remoteAddress)) {
        writeJson(response, 403, { ok: false, error: 'Raw data is available only from localhost' });
        return;
      }
      if (!database?.snapshot) {
        writeJson(response, 503, { ok: false, error: 'Database is unavailable' });
        return;
      }
      if (request.method !== 'GET') {
        writeJson(response, 405, { ok: false, error: 'Method not allowed' });
        return;
      }
      writeJson(response, 200, database.snapshot(), { pretty: true });
      return;
    }

    if (pathname === '/dev' || pathname.startsWith('/dev/') || pathname.startsWith('/api/dev/')) {
      if (!isLoopback(request.socket.remoteAddress)) {
        writeJson(response, 403, { ok: false, error: 'Developer dashboard is available only from localhost' });
        return;
      }
      if (await handleDeveloperDashboard({ request, response, pathname, database, audit })) return;
      writeJson(response, 404, { ok: false, error: 'Dashboard route not found' });
      return;
    }

    if (request.method !== 'GET') {
      writeJson(response, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    if (pathname !== '/' && pathname !== '/health') {
      writeJson(response, 404, { ok: false, error: 'Not found' });
      return;
    }

    writeJson(response, client.isReady() ? 200 : 503, {
      ok: client.isReady(),
      service: 'HathorBot Flamingo RPG',
      discord: client.isReady() ? 'connected' : 'disconnected',
      guilds: client.guilds.cache.size,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    })().catch((error) => {
      console.error('[http] Request failed:', error);
      if (!response.headersSent) writeJson(response, error.statusCode ?? 500, { ok: false, error: error.message ?? 'Internal server error' });
      else response.destroy();
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      console.log(`[http] Health server listening on http://${host}:${port}`);
      console.log('[http] Raw development data is available from localhost only at /data');
      console.log('[http] Visual developer dashboard is available from localhost only at /dev');
      resolve(server);
    });
  });
}

export function stopHealthServer(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
