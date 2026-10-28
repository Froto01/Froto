import { execFileSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:https';
import { chromium, firefox, webkit } from '@playwright/test';
import { checkUatEnvironment } from '../lib/uat-safety.cjs';

export function generateLocalCertificates(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const rootKey = join(directory, 'root.key');
  const root = join(directory, 'root.crt');
  const key = join(directory, 'localhost.key');
  const cert = join(directory, 'localhost.crt');
  const csr = join(directory, 'localhost.csr');
  const ext = join(directory, 'localhost.ext');
  const openssl = args => execFileSync('openssl', args, { stdio: 'pipe' });
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', rootKey, '-out', root, '-days', '2', '-subj', '/CN=Froto UAT Ephemeral Local Root', '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0', '-addext', 'keyUsage=critical,keyCertSign,cRLSign', '-addext', 'nameConstraints=critical,permitted;DNS:localhost']);
  openssl(['req', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', csr, '-subj', '/CN=localhost']);
  writeFileSync(ext, 'subjectAltName=DNS:localhost\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n', { mode: 0o600 });
  openssl(['x509', '-req', '-in', csr, '-CA', root, '-CAkey', rootKey, '-CAcreateserial', '-out', cert, '-days', '1', '-extfile', ext]);
  chmodSync(key, 0o600);
  for (const path of [rootKey, csr, ext, join(directory, 'root.srl')]) rmSync(path, { force: true });
  return { root, key, cert };
}

async function prepareRunnerTls() {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.CI !== 'true') throw new Error('CA trust installation is restricted to the ephemeral Actions runner');
  if (checkUatEnvironment().length) throw new Error('Isolated development UAT configuration is required before local TLS setup');
  const files = generateLocalCertificates(resolve('playwright/.auth/tls'));
  // Trust this short-lived localhost CA, rather than ignoring TLS errors.
  execFileSync('sudo', ['cp', files.root, '/usr/local/share/ca-certificates/froto-uat.crt']);
  execFileSync('sudo', ['update-ca-certificates'], { stdio: 'pipe' });
  execFileSync('sudo', ['apt-get', 'install', '-y', 'libnss3-tools'], { stdio: 'pipe' });
  const nss = join(homedir(), '.pki/nssdb');
  mkdirSync(nss, { recursive: true });
  if (!existsSync(join(nss, 'cert9.db'))) execFileSync('certutil', ['-N', '--empty-password', '-d', `sql:${nss}`]);
  execFileSync('certutil', ['-A', '-n', 'Froto UAT ephemeral localhost', '-t', 'C,,', '-i', files.root, '-d', `sql:${nss}`]);
  const policiesPath = join(dirname(firefox.executablePath()), 'distribution/policies.json');
  mkdirSync(dirname(policiesPath), { recursive: true });
  const policies = existsSync(policiesPath) ? JSON.parse(readFileSync(policiesPath, 'utf8')) : {};
  policies.policies ??= {};
  policies.policies.Certificates ??= {};
  const installed = policies.policies.Certificates.Install ?? [];
  if (!Array.isArray(installed)) throw new Error('Unexpected existing Firefox certificate policy');
  policies.policies.Certificates.Install = [...installed, files.root];
  writeFileSync(policiesPath, JSON.stringify(policies));
  appendFileSync(process.env.GITHUB_ENV, `NODE_EXTRA_CA_CERTS=${files.root}\n`);
  // Transport-only preflight, not browser-journey evidence. Every engine must
  // accept the certificate with its normal TLS validation still enabled.
  const server = createServer({ key: readFileSync(files.key), cert: readFileSync(files.cert) }, (_req, res) => res.end('Froto UAT TLS transport probe'));
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3100, 'localhost', resolve); });
  try {
    for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ ignoreHTTPSErrors: false });
        const response = await page.goto('https://localhost:3100');
        if (response.status() !== 200 || await page.textContent('body') !== 'Froto UAT TLS transport probe') throw new Error('Unexpected local TLS response');
        console.log(`Local HTTPS certificate validation passed: ${name}`);
      } finally { await browser.close(); }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
  console.log('Ephemeral trusted localhost HTTPS is ready; CA signing key removed, authentication storage excluded from artifacts.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await prepareRunnerTls();
