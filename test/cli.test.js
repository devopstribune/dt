// Automated Test Suite for DevOps Tribune CLI (dt)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('node:child_process');
const path = require('node:path');

const DT_BIN = path.resolve(__dirname, '../bin/dt.js');

function runDt(args = '') {
  try {
    const output = execSync(`node "${DT_BIN}" ${args}`, {
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' }
    });
    return { stdout: output, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout ? err.stdout.toString() : '', stderr: err.stderr ? err.stderr.toString() : '', exitCode: err.status };
  }
}

test('CLI: version output', () => {
  const res = runDt('version');
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes('dt version 1.0.0'));
});

test('CLI: help screen displays commands and options', () => {
  const res = runDt('help');
  assert.equal(res.exitCode, 0);
  assert.ok(res.stdout.includes('Usage: dt <command>'));
  assert.ok(res.stdout.includes('news'));
  assert.ok(res.stdout.includes('articles'));
  assert.ok(res.stdout.includes('interview'));
  assert.ok(res.stdout.includes('tool'));
});

test('CLI: dt news --json returns valid news items', () => {
  const res = runDt('news --limit 5 --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.ok(data.count <= 5);
  assert.ok(Array.isArray(data.items));
  assert.ok(data.items.length > 0);
  assert.ok(data.items[0].title);
  assert.ok(data.items[0].canonical_url);
});

test('CLI: dt articles --json returns publications', () => {
  const res = runDt('articles --limit 3 --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.ok(data.count <= 3);
  assert.ok(Array.isArray(data.items));
  assert.ok(data.items.length > 0);
  assert.ok(data.items[0].slug);
});

test('CLI: dt article <slug> returns single article details', () => {
  const res = runDt('article terraform-best-practices --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.slug, 'terraform-best-practices');
  assert.ok(data.title.includes('Terraform Best Practices'));
  assert.ok(data.reading_time_minutes > 0);
});

test('CLI: dt interview k8s returns interview drill', () => {
  const res = runDt('interview k8s --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.slug, 'kubernetes');
  assert.ok(data.canonical_url.includes('/interviews/kubernetes/'));
});

test('CLI: dt tool cron parses schedule in plain English', () => {
  const res = runDt('tool cron "*/15 0-4 * * 1-5" --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.minute, '*/15');
  assert.equal(data.hour, '0-4');
  assert.ok(data.humanDescription.includes('every 15 minutes'));
});

test('CLI: dt tool cidr calculates VPC netmask and hosts', () => {
  const res = runDt('tool cidr 192.168.1.0/24 --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.netmask, '255.255.255.0');
  assert.equal(data.networkAddress, '192.168.1.0');
  assert.equal(data.broadcastAddress, '192.168.1.255');
  assert.equal(data.usableHosts, 254);
  assert.equal(data.firstUsableHost, '192.168.1.1');
  assert.equal(data.lastUsableHost, '192.168.1.254');
});

test('CLI: dt tool base64 encodes string and provides k8s snippet', () => {
  const res = runDt('tool base64 encode "hello-devops" --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.output, 'aGVsbG8tZGV2b3Bz');
  assert.ok(data.kubernetesYamlSnippet.includes('aGVsbG8tZGV2b3Bz'));
});

test('CLI: dt tool passgen generates random password with complexity', () => {
  const res = runDt('tool passgen 16 3 --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.length, 16);
  assert.equal(data.complexity, 3);
  assert.equal(typeof data.password, 'string');
  assert.equal(data.password.length, 16);
  assert.ok(data.entropyBits >= 100);
});

test('CLI: dt passgen top-level alias generates alphanumeric password', () => {
  const res = runDt('passgen 12 1 --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.length, 12);
  assert.equal(data.complexity, 1);
  assert.equal(data.password.length, 12);
  assert.ok(/^[A-Za-z0-9]+$/.test(data.password));
});

test('CLI: dt status reports edge status', () => {
  const res = runDt('status --json');
  assert.equal(res.exitCode, 0);
  const data = JSON.parse(res.stdout);
  assert.equal(data.cliVersion, '1.0.0');
  assert.equal(data.status, 'HEALTHY');
  assert.ok(data.catalogs.articles >= 32);
});
