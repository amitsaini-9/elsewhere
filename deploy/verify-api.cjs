/* Run after npm run build: node deploy/verify-api.cjs
 * Starts its own server and database. Never connects to the deployed waitlist.
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { createServer } = require('node:net');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const project = resolve(__dirname, '..');
const port = 3305;
const origin = `http://127.0.0.1:${port}`;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function requireUnusedPort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen({ port, host: '127.0.0.1', exclusive: true }, resolve);
  });
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
}

function trackedChild(args, env) {
  const child = spawn(process.execPath, args, { cwd: project, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });
  const closed = new Promise(resolve => {
    child.once('error', error => resolve({ code: null, error }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  return { child, closed, output: () => output };
}

async function stop(tracked) {
  if (!tracked || tracked.child.exitCode !== null || tracked.child.signalCode !== null) return;
  tracked.child.kill('SIGTERM');
  const stopped = await Promise.race([tracked.closed.then(() => true), delay(3000).then(() => false)]);
  if (!stopped) {
    tracked.child.kill('SIGKILL');
    await tracked.closed;
  }
}

async function ready(server) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.child.exitCode !== null || server.child.signalCode !== null) {
      throw new Error(`Disposable Next process exited before readiness.\n${server.output()}`);
    }
    if (/Ready in/.test(server.output())) return;
    await delay(200);
  }
  throw new Error(`Disposable Next process did not become ready.\n${server.output()}`);
}

async function main() {
  await requireUnusedPort();
  const temporaryPrefix = join(tmpdir(), 'elsewhere-api-verify-');
  const directory = await mkdtemp(temporaryPrefix);
  const database = join(directory, 'waitlist.sqlite');
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    ELSEWHERE_DB_PATH: database,
    ELSEWHERE_PUBLIC_ORIGIN: origin,
  };
  let server;
  let test;
  try {
    server = trackedChild(['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], env);
    await ready(server);
    console.log(`Disposable API verification running on ${origin}, using ${database}.`);
    test = trackedChild(['deploy/test-waitlist.cjs', origin], env);
    let timeout;
    const result = await Promise.race([
      test.closed,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Waitlist verification exceeded 30 seconds.')), 30000);
      }),
    ]).finally(() => clearTimeout(timeout));
    if (test.output()) process.stdout.write(test.output());
    if (result.error) throw result.error;
    assert.equal(result.code, 0, `Waitlist verification exited unsuccessfully.\n${server.output()}`);
  } finally {
    await stop(test);
    await stop(server);
    assert(directory.startsWith(temporaryPrefix) && directory.length > temporaryPrefix.length, 'Only the generated temporary directory may be removed');
    await rm(directory, { recursive: true, force: true });
    console.log('Disposable Next process stopped and its temporary database removed.');
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
