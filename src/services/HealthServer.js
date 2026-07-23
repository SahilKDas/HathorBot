import { createServer } from 'node:http';

function writeJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

export function startHealthServer({ client, host, port }) {
  const server = createServer((request, response) => {
    if (request.method !== 'GET') {
      writeJson(response, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    if (request.url !== '/' && request.url !== '/health') {
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
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      console.log(`[http] Health server listening on http://${host}:${port}`);
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
