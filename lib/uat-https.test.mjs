import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { request } from 'node:https';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateLocalCertificates } from '../scripts/uat-tls.mjs';
import { createUatTlsServer } from '../scripts/uat-server.mjs';

const directory = mkdtempSync(join(tmpdir(), 'froto-tls-'));
const files = generateLocalCertificates(directory);
after(() => rmSync(directory, { recursive: true, force: true }));
const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, 'localhost', () => resolve(server.address().port)); });
const close = server => new Promise(resolve => server.close(resolve));
function send(port, { host = 'localhost:3100', ca = readFileSync(files.root), body = '' } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: 'localhost', servername: 'localhost', port, path: '/actual/path?fixture=1', method: 'POST', ca, rejectUnauthorized: true, headers: { host, 'content-type': 'text/plain' } }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text }));
    });
    req.on('error', reject); req.end(body);
  });
}

test('local HTTPS validates its CA and forwards the real request with canonical origin', async () => {
  const upstream = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    res.writeHead(201, { 'content-type': 'application/json', 'x-uat-upstream': 'actual' });
    res.end(JSON.stringify({ method: req.method, path: req.url, body, host: req.headers.host, protocol: req.headers['x-forwarded-proto'] }));
  });
  const upstreamPort = await listen(upstream);
  const gateway = createUatTlsServer({ key: readFileSync(files.key), cert: readFileSync(files.cert), upstreamPort });
  try {
    const port = await listen(gateway); const response = await send(port, { body: 'owned transport fixture' });
    assert.equal(response.status, 201); assert.equal(response.headers['x-uat-upstream'], 'actual');
    assert.deepEqual(JSON.parse(response.body), { method: 'POST', path: '/actual/path?fixture=1', body: 'owned transport fixture', host: 'localhost:3100', protocol: 'https' });
    assert.equal(existsSync(join(directory, 'root.key')), false);
    await assert.rejects(send(port, { ca: [] }), error => /certificate|issuer|self.signed/i.test(error.message));
  } finally { await close(gateway); await close(upstream); }
});

test('local HTTPS rejects a different Host before forwarding', async () => {
  let forwarded = 0;
  const upstream = createServer((_req, res) => { forwarded++; res.end('unexpected'); });
  const upstreamPort = await listen(upstream);
  const gateway = createUatTlsServer({ key: readFileSync(files.key), cert: readFileSync(files.cert), upstreamPort });
  try {
    const port = await listen(gateway); const response = await send(port, { host: 'production.example' });
    assert.equal(response.status, 400); assert.equal(forwarded, 0);
  } finally { await close(gateway); await close(upstream); }
});
