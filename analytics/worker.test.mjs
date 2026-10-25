import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { canonicalIp } from './worker.mjs';

// A small D1-shaped adapter executes the actual production SQL against SQLite.
// Like D1 batch(), every batch is one transaction, including rollback on failure.
class SQLiteD1 {
  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    this.failBatchAt = -1;
  }
  prepare(sql) {
    const database = this;
    return {
      sql, bindings: [],
      bind(...bindings) { return { ...this, bindings }; },
      async first() { return database.sqlite.prepare(sql).get(...this.bindings) || null; },
    };
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try {
      const result = statements.map((statement, index) => {
        if (index === this.failBatchAt) throw new Error('Injected SQLite transaction failure');
        return { success: true, results: this.sqlite.prepare(statement.sql).all(...statement.bindings) };
      });
      this.sqlite.exec('COMMIT');
      return result;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }
}

function setup(t) {
  const DB = new SQLiteD1();
  t.after(() => DB.sqlite.close());
  return { DB, ALLOWED_ORIGINS: 'https://example.com,https://wenatnyu.github.io',
    SITE_PATH_PREFIX: '/IGCS0478/', ADMIN_USER: 'teacher', ADMIN_PASSWORD: 'test-only-password-12345' };
}

function visit(env, { ip = '192.0.2.1', origin = 'https://example.com',
  path = '/IGCS0478/index.html', body = { path }, headers = {}, url = 'https://analytics.example/api/visit' } = {}) {
  const requestHeaders = { 'Content-Type': 'application/json', ...headers };
  if (origin !== null) requestHeaders.Origin = origin;
  if (ip !== null) requestHeaders['CF-Connecting-IP'] = ip;
  return worker.fetch(new Request(url, {
    method: 'POST', headers: requestHeaders, body: typeof body === 'string' ? body : JSON.stringify(body),
  }), env);
}

function auth(env) {
  return `Basic ${Buffer.from(`${env.ADMIN_USER}:${env.ADMIN_PASSWORD}`).toString('base64')}`;
}

async function stats(env) {
  const result = await worker.fetch(new Request('https://analytics.example/api/admin/stats',
    { headers: { Authorization: auth(env) } }), env);
  assert.equal(result.status, 200);
  return result.json();
}

test('public count begins at zero and exposes only pageviews', async t => {
  const env = setup(t);
  const result = await worker.fetch(new Request('https://analytics.example/api/count'), env);
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { pageviews: 0 });
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
});

test('visits count refreshes, ignore client-supplied IP, and deduplicate addresses', async t => {
  const env = setup(t);
  for (let index = 1; index <= 3; index++) {
    const result = await visit(env, { body: { path: '/IGCS0478/chapter.html', ip: '203.0.113.250' },
      headers: { 'X-Forwarded-For': '203.0.113.251' } });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { pageviews: index });
    assert.equal(result.headers.get('Access-Control-Allow-Origin'), 'https://example.com');
  }
  const actual = await stats(env);
  assert.equal(actual.pageviews, 3);
  assert.equal(actual.retainedDistinctIps, 10);
  assert.equal(actual.recentVisitors.length, 1);
  assert.equal(actual.recentVisitors[0].ip, '192.0.2.1');
  assert.match(actual.recentVisitors[0].lastSeen, /^\d{4}-\d{2}-\d{2}T.*Z$/);
});

test('admin UI and stats require correct credentials and never expose IPs anonymously', async t => {
  const env = setup(t);
  await visit(env);
  for (const path of ['/admin', '/admin/', '/api/admin/stats']) {
    for (const authorization of ['', 'Basic !!!', `Basic ${Buffer.from('teacher:wrong').toString('base64')}`]) {
      const result = await worker.fetch(new Request(`https://analytics.example${path}`,
        { headers: { Authorization: authorization } }), env);
      assert.equal(result.status, 401);
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
      assert.match(result.headers.get('WWW-Authenticate'), /^Basic /);
      assert.doesNotMatch(await result.text(), /192\.0\.2\.1|test-only-password/);
      assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
    }
  }
  const result = await worker.fetch(new Request('https://analytics.example/admin',
    { headers: { Authorization: auth(env) } }), env);
  assert.equal(result.status, 200);
  assert.match(result.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
  const html = await result.text();
  assert.match(html, /textContent = visitor\.ip/);
  assert.doesNotMatch(html, /192\.0\.2\.1|test-only-password|innerHTML/);
  assert.equal((await stats(env)).pageviews, 1);
});

test('distinct IP retention is capped at 10 and repeats move to the top', async t => {
  const env = setup(t);
  for (let index = 1; index <= 13; index++) assert.equal((await visit(env, { ip: `192.0.2.${index}` })).status, 200);
  let actual = await stats(env);
  assert.equal(actual.pageviews, 13);
  assert.deepEqual(actual.recentVisitors.map(row => row.ip),
    Array.from({ length: 10 }, (_, index) => `192.0.2.${13 - index}`));
  await visit(env, { ip: '192.0.2.5' });
  actual = await stats(env);
  assert.equal(actual.pageviews, 14);
  assert.equal(actual.recentVisitors.length, 10);
  assert.equal(actual.recentVisitors[0].ip, '192.0.2.5');
  assert.equal(actual.recentVisitors.filter(row => row.ip === '192.0.2.5').length, 1);
  await visit(env, { ip: '192.0.2.1' });
  actual = await stats(env);
  assert.equal(actual.pageviews, 15);
  assert.equal(actual.recentVisitors[0].ip, '192.0.2.1');
  assert.equal(actual.recentVisitors.some(row => row.ip === '192.0.2.4'), false);
  assert.equal(env.DB.sqlite.prepare('SELECT count(*) AS n FROM recent_visitors').get().n, 10);
});

test('concurrent requests receive unique sequence counts and preserve 10 recent addresses', async t => {
  const env = setup(t);
  const results = await Promise.all(Array.from({ length: 40 }, (_, index) => visit(env, { ip: `192.0.2.${index + 1}` })));
  assert.ok(results.every(result => result.status === 200));
  const counts = await Promise.all(results.map(result => result.json().then(body => body.pageviews)));
  assert.deepEqual([...counts].sort((left, right) => left - right), Array.from({ length: 40 }, (_, index) => index + 1));
  const actual = await stats(env);
  assert.equal(actual.pageviews, 40);
  assert.equal(actual.recentVisitors.length, 10);
  assert.equal(new Set(actual.recentVisitors.map(row => row.ip)).size, 10);
});

test('failed transaction rolls back counter and visitor changes together', async t => {
  const env = setup(t);
  await visit(env);
  for (const failureIndex of [1, 2]) {
    env.DB.failBatchAt = failureIndex;
    const failed = await visit(env, { ip: '192.0.2.99' });
    assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { error: 'Analytics temporarily unavailable' });
    env.DB.failBatchAt = -1;
    const actual = await stats(env);
    assert.equal(actual.pageviews, 1);
    assert.deepEqual(actual.recentVisitors.map(row => row.ip), ['192.0.2.1']);
  }
});

test('schema initialization is idempotent and counter overflow rolls back', async t => {
  const env = setup(t);
  await visit(env);
  env.DB.sqlite.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  assert.equal((await stats(env)).pageviews, 1);
  env.DB.sqlite.exec('UPDATE site_stats SET pageviews = 9007199254740991 WHERE id = 1');
  const failed = await visit(env, { ip: '192.0.2.2' });
  assert.equal(failed.status, 503);
  const actual = await stats(env);
  assert.equal(actual.pageviews, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(actual.recentVisitors.map(row => row.ip), ['192.0.2.1']);
});

test('IPv6 spellings and IPv4-mapped IPv6 have canonical distinct identities', async t => {
  const env = setup(t);
  assert.equal(canonicalIp('2001:0DB8:0000:0000:0000:0000:0000:0001'), '2001:db8::1');
  assert.equal(canonicalIp('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(canonicalIp('::ffff:c000:201'), '192.0.2.1');
  for (const ip of ['2001:0DB8:0:0:0:0:0:1', '2001:db8::1', '::ffff:192.0.2.1', '192.0.2.1']) {
    assert.equal((await visit(env, { ip })).status, 200);
  }
  const actual = await stats(env);
  assert.equal(actual.pageviews, 4);
  assert.deepEqual(actual.recentVisitors.map(row => row.ip), ['192.0.2.1', '2001:db8::1']);
  for (const invalid of ['example.com', '192.0.2.1,203.0.113.1', '999.1.1.1', 'fe80::1%eth0', '127.000.0.1', '']) {
    assert.equal(canonicalIp(invalid), null);
  }
});

test('Cloudflare pseudo IPv4 uses preserved IPv6 only in overwrite context', async t => {
  const env = setup(t);
  await visit(env, { ip: '240.1.2.3', headers: { 'CF-Connecting-IPv6': '2001:0db8::3' } });
  await visit(env, { ip: '192.0.2.1', headers: { 'CF-Connecting-IPv6': '2001:db8::99' } });
  const actual = await stats(env);
  assert.deepEqual(actual.recentVisitors.map(row => row.ip), ['192.0.2.1', '2001:db8::3']);
  assert.equal((await visit(env, { ip: null, headers: { 'CF-Connecting-IPv6': '2001:db8::3' } })).status, 400);
});

test('CORS allowlist and preflight are exact; Origin cannot authorize admin access', async t => {
  const env = setup(t);
  for (const origin of [null, 'null', 'https://example.com.attacker.test', 'http://example.com']) {
    assert.equal((await visit(env, { origin })).status, 403);
  }
  const good = await worker.fetch(new Request('https://analytics.example/api/visit', {
    method: 'OPTIONS', headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type' },
  }), env);
  assert.equal(good.status, 204);
  assert.equal(good.headers.get('Access-Control-Allow-Origin'), 'https://example.com');
  assert.equal(good.headers.get('Access-Control-Allow-Credentials'), null);
  const bad = await worker.fetch(new Request('https://analytics.example/api/visit', {
    method: 'OPTIONS', headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization' },
  }), env);
  assert.equal(bad.status, 403);
  const admin = await worker.fetch(new Request('https://analytics.example/api/admin/stats',
    { headers: { Origin: 'https://example.com' } }), env);
  assert.equal(admin.status, 401);
  assert.equal((await stats(env)).pageviews, 0);
});

test('path, JSON, address, transport, and request size validation do not increment count', async t => {
  const env = setup(t);
  for (const path of ['/other/index.html', '/IGCS0478evil/index.html', '/IGCS0478/../private.html',
    '/IGCS0478/%2e%2e/private.html', '/IGCS0478/%2fprivate.html', '/IGCS0478//index.html',
    '/IGCS0478/index.html?secret=yes', '/IGCS0478/index.html#x', '/IGCS0478/a\\b.html',
    '/IGCS0478/a.pdf', '/IGCS0478/%ZZ.html', null, 'a'.repeat(600)]) {
    assert.equal((await visit(env, { path })).status, 400, String(path));
  }
  for (const body of ['', 'not json', [], null, { path: '/IGCS0478/index.html', extra: 'x'.repeat(1100) }]) {
    assert.equal((await visit(env, { body })).status, 400);
  }
  assert.equal((await visit(env, { ip: null, headers: { 'X-Forwarded-For': '192.0.2.1' } })).status, 400);
  assert.equal((await visit(env, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await visit(env, { url: 'http://analytics.example/api/visit' })).status, 400);
  assert.equal((await stats(env)).pageviews, 0);
  assert.equal((await visit(env, { path: '/IGCS0478/' })).status, 200);
  assert.equal((await visit(env, { path: '/IGCS0478/%E8%AF%BE%E7%A8%8B.html' })).status, 200);
});

test('missing or unsafe configuration fails closed without leaking secrets', async t => {
  const env = setup(t);
  for (const field of ['DB', 'ADMIN_USER', 'ADMIN_PASSWORD', 'ALLOWED_ORIGINS', 'SITE_PATH_PREFIX']) {
    const invalid = { ...env };
    delete invalid[field];
    const result = await visit(invalid);
    assert.equal(result.status, 503, field);
    assert.doesNotMatch(await result.text(), /test-only-password|192\.0\.2/);
  }
  for (const ALLOWED_ORIGINS of ['*', 'https://example.com/', 'https://example.com/path', '', 'http://example.com']) {
    assert.equal((await visit({ ...env, ALLOWED_ORIGINS })).status, 503);
  }
  for (const SITE_PATH_PREFIX of ['', 'IGCS0478/', '/IGCS0478', '/../', '//', '/x?y/']) {
    assert.equal((await visit({ ...env, SITE_PATH_PREFIX })).status, 503);
  }
});

test('unsupported routes and methods cannot write analytics', async t => {
  const env = setup(t);
  const result = await worker.fetch(new Request('https://analytics.example/api/visit'), env);
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('Allow'), 'POST');
  const missing = await worker.fetch(new Request('https://analytics.example/unknown'), env);
  assert.equal(missing.status, 404);
  assert.equal((await stats(env)).pageviews, 0);
});
