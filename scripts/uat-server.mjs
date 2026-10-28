import { createServer } from 'node:https';
import { request } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function createUatTlsServer({ key, cert, upstreamPort = 3101 }) {
  return createServer({ key, cert, minVersion: 'TLSv1.2' }, (incoming, outgoing) => {
    if (incoming.headers.host !== 'localhost:3100') { outgoing.writeHead(400); outgoing.end('Unexpected UAT host'); return; }
    const upstream = request({ hostname: 'localhost', port: upstreamPort, method: incoming.method, path: incoming.url, headers: {
      ...incoming.headers, host: 'localhost:3100', 'x-forwarded-host': 'localhost:3100', 'x-forwarded-proto': 'https', 'x-forwarded-port': '3100',
    } }, response => { outgoing.writeHead(response.statusCode, response.headers); response.pipe(outgoing); });
    upstream.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end('Local UAT upstream unavailable'); });
    incoming.on('aborted', () => upstream.destroy());
    incoming.pipe(upstream);
  });
}

async function startApplication() {
  const directory = resolve('playwright/.auth/tls');
  const server = createUatTlsServer({ key: readFileSync(resolve(directory, 'localhost.key')), cert: readFileSync(resolve(directory, 'localhost.crt')) });
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', 'localhost', '--port', '3101'], { stdio: 'inherit', env: process.env });
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(); app.kill('SIGTERM');
    setTimeout(() => process.exit(), 5000).unref();
  };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
  app.on('error', () => { console.error('Local built application could not start'); process.exit(1); });
  app.on('exit', code => { if (!shuttingDown) { server.close(); process.exit(code || 1); } });
  server.on('error', () => { console.error('Local HTTPS listener could not start'); shutdown(); process.exitCode = 1; });
  // The only public test origin is HTTPS localhost:3100. The real built Next
  // process is reached through loopback HTTP, with its canonical forwarded origin.
  server.listen(3100, 'localhost');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await startApplication();
