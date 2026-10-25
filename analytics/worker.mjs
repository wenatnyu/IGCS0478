import { isIP } from 'node:net';

const MAX_BODY_BYTES = 1024;
const RETAINED_IPS = 10;
const encoder = new TextEncoder();

function isLoopback(hostname) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
}

function config(env) {
  if (!env.DB?.prepare || !env.DB?.batch || typeof env.ADMIN_USER !== 'string' ||
      !env.ADMIN_USER.trim() || env.ADMIN_USER.includes(':') ||
      typeof env.ADMIN_PASSWORD !== 'string' || !env.ADMIN_PASSWORD.trim() ||
      typeof env.ALLOWED_ORIGINS !== 'string' || typeof env.SITE_PATH_PREFIX !== 'string') {
    throw new Error('Incomplete configuration');
  }
  const origins = env.ALLOWED_ORIGINS.split(',').map(value => value.trim());
  if (!origins.length || origins.some(value => {
    try {
      const url = new URL(value);
      return url.origin !== value || (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && isLoopback(url.hostname)));
    } catch { return true; }
  })) throw new Error('Invalid origins');
  const prefix = env.SITE_PATH_PREFIX;
  if (!prefix.startsWith('/') || !prefix.endsWith('/') || prefix.includes('//') ||
      /[?#%\\\s]/u.test(prefix) || prefix.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('Invalid site prefix');
  }
  return { origins: new Set(origins), prefix };
}

function response(body, status = 200, origin = null, extraHeaders = {}) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Vary': 'Origin',
    ...extraHeaders,
  });
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  if (body !== null && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(body === null || typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
}

function error(message, status, origin = null, extraHeaders = {}) {
  return response({ error: message }, status, origin, extraHeaders);
}

export function canonicalIp(value) {
  if (typeof value !== 'string' || value.length > 45 || value.includes('%') || !isIP(value)) return null;
  if (isIP(value) === 4) return value;
  const address = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = address.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mapped) {
    const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
    return [high >> 8, high & 255, low >> 8, low & 255].join('.');
  }
  return address;
}

function clientIp(request) {
  const primary = canonicalIp(request.headers.get('CF-Connecting-IP'));
  if (!primary) return null;
  // Cloudflare's Pseudo IPv4 overwrite mode uses Class E IPv4 addresses and
  // preserves the original address in CF-Connecting-IPv6. Ignore that secondary
  // header in every other case, and never consult X-Forwarded-For or body fields.
  if (isIP(primary) === 4 && Number(primary.split('.')[0]) >= 240) {
    const original = request.headers.get('CF-Connecting-IPv6');
    if (original !== null) return isIP(original) === 6 ? canonicalIp(original) : null;
  }
  return primary;
}

function validPath(path, prefix) {
  if (typeof path !== 'string' || path.length > 512 || !path.startsWith(prefix) ||
      /[?#\\\u0000-\u0020\u007f]/u.test(path) || /%(2f|5c|00)/i.test(path)) return false;
  try {
    const decoded = decodeURIComponent(path);
    if (decoded.includes('//') || /[?#\\\u0000-\u001f\u007f]/u.test(decoded) ||
        decoded.split('/').some(part => part === '.' || part === '..')) return false;
    return path.endsWith('/') || /\.html?$/i.test(path);
  } catch { return false; }
}

async function readVisitBody(request) {
  const length = request.headers.get('Content-Length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw new Error('Body too large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('Body too large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

async function authorized(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (header.length > 2048 || !/^Basic [A-Za-z0-9+/]+={0,2}$/i.test(header)) return false;
  let supplied;
  try {
    supplied = new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(atob(header.slice(6)), character => character.charCodeAt(0)));
  } catch { return false; }
  const [actual, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
    crypto.subtle.digest('SHA-256', encoder.encode(`${env.ADMIN_USER}:${env.ADMIN_PASSWORD}`)),
  ]);
  const left = new Uint8Array(actual), right = new Uint8Array(expected);
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

const adminHtml = nonce => `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>访问统计 · Site analytics</title>
<style nonce="${nonce}">
:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172137;background:#f4f6fa;color-scheme:light}*{box-sizing:border-box}body{margin:0;padding:32px 20px}main{max-width:880px;margin:auto}h1{font-size:clamp(1.6rem,4vw,2.2rem);margin:0 0 8px}p{line-height:1.6;color:#526078}.card{background:white;border:1px solid #dfe4ed;border-radius:16px;padding:24px;margin:24px 0}.metric{font-size:3.2rem;line-height:1.1;font-weight:750;font-variant-numeric:tabular-nums;margin:12px 0;color:#543fb1}.top{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}h2{font-size:1.2rem;margin:0}button{font:inherit;color:white;background:#543fb1;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}button:disabled{opacity:.6}button:focus-visible{outline:3px solid #c6b9ff;outline-offset:3px}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;margin-top:20px;text-align:left}th,td{padding:14px 10px;border-bottom:1px solid #e7eaf1}th{font-size:.85rem;color:#526078}td:first-child{font-family:ui-monospace,monospace;overflow-wrap:anywhere}time{white-space:nowrap}small{display:block;color:#647086;font-size:.85rem}.note{font-size:.9rem}.status{min-height:1.5em;margin-bottom:0}@media(max-width:520px){body{padding:24px 12px}.card{padding:18px 14px}th,td{padding:12px 6px;font-size:.85rem}}
</style></head><body><main>
<h1>访问统计 <small>Site analytics · 管理员可见</small></h1>
<p>统计从启用时开始。刷新页面会增加访问量；IP 地址不等于独立访客。</p>
<section class="card" aria-labelledby="count-title"><h2 id="count-title">页面访问量 / Page views</h2><div class="metric" id="pageviews">—</div><small>累计收到的页面访问请求</small></section>
<section class="card" aria-labelledby="recent-title"><div class="top"><h2 id="recent-title">最近 10 个不同 IP <small>Last 10 distinct IP addresses</small></h2><button id="refresh" type="button">↻ 刷新 / Refresh</button></div>
<div class="table-wrap"><table><thead><tr><th scope="col">IP 地址</th><th scope="col">最近访问 / Last seen (UTC)</th></tr></thead><tbody id="visitors"></tbody></table></div>
<p id="status" class="status" role="status" aria-live="polite">正在加载…</p></section>
<p class="note">重复 IP 再次访问会移到最前。此列表仅保留最近 10 个不同 IP，不提供历史访问日志。统计页自身不计入访问量。</p>
</main><script nonce="${nonce}">
const button = document.getElementById('refresh');
async function refresh() {
  button.disabled = true;
  const status = document.getElementById('status');
  status.textContent = '正在加载…';
  try {
    const response = await fetch('/api/admin/stats', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Request failed');
    const stats = await response.json();
    document.getElementById('pageviews').textContent = Number(stats.pageviews).toLocaleString();
    const body = document.getElementById('visitors');
    body.replaceChildren();
    for (const visitor of stats.recentVisitors) {
      const row = document.createElement('tr');
      const address = document.createElement('td');
      address.textContent = visitor.ip;
      const seen = document.createElement('td');
      const time = document.createElement('time');
      time.dateTime = visitor.lastSeen;
      time.textContent = visitor.lastSeen.replace('T', ' ').replace(/\\.\\d{3}Z$/, ' UTC');
      seen.append(time); row.append(address, seen); body.append(row);
    }
    status.textContent = stats.recentVisitors.length ? '已更新 / Updated' : '尚无访问记录 / No visits yet';
  } catch { status.textContent = '暂时无法读取统计，请刷新重试。/ Unable to load statistics.'; }
  finally { button.disabled = false; }
}
button.addEventListener('click', refresh);
refresh();
</script></body></html>`;

async function handle(request, env) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:' && !isLoopback(url.hostname)) return error('HTTPS required', 400);
  let settings;
  try { settings = config(env); }
  catch { return error('Analytics is not configured', 503); }

  const isAdmin = url.pathname === '/admin' || url.pathname === '/admin/' || url.pathname === '/api/admin/stats';
  if (isAdmin) {
    if (!await authorized(request, env)) return error('Authentication required', 401, null,
      { 'WWW-Authenticate': 'Basic realm="Site analytics", charset="UTF-8"' });
    if (request.method !== 'GET') return error('Method not allowed', 405, null, { Allow: 'GET' });
    if (url.pathname !== '/api/admin/stats') {
      const nonce = crypto.randomUUID();
      return response(adminHtml(nonce), 200, null, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
        'X-Frame-Options': 'DENY',
      });
    }
    const results = await env.DB.batch([
      env.DB.prepare('SELECT pageviews FROM site_stats WHERE id = 1'),
      env.DB.prepare('SELECT ip, last_seen FROM recent_visitors ORDER BY last_sequence DESC LIMIT 10'),
    ]);
    const row = results[0].results[0];
    if (!row) throw new Error('Missing stats');
    return response({
      pageviews: row.pageviews,
      recentVisitors: results[1].results.map(visitor => ({ ip: visitor.ip, lastSeen: new Date(visitor.last_seen).toISOString() })),
      retainedDistinctIps: RETAINED_IPS,
    });
  }

  if (!['/api/visit', '/api/count'].includes(url.pathname)) return error('Not found', 404);
  const requestOrigin = request.headers.get('Origin');
  const origin = settings.origins.has(requestOrigin) ? requestOrigin : null;
  if (requestOrigin && !origin) return error('Origin not allowed', 403);
  const expectedMethod = url.pathname === '/api/visit' ? 'POST' : 'GET';
  if (request.method === 'OPTIONS') {
    const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') || '')
      .split(',').map(header => header.trim().toLowerCase()).filter(Boolean);
    if (!origin || request.headers.get('Access-Control-Request-Method') !== expectedMethod ||
        requestedHeaders.some(header => header !== 'content-type')) return error('Preflight not allowed', 403);
    return response(null, 204, origin, {
      'Access-Control-Allow-Methods': expectedMethod,
      'Access-Control-Allow-Headers': 'Content-Type',
    });
  }
  if (request.method !== expectedMethod) return error('Method not allowed', 405, origin, { Allow: expectedMethod });
  if (url.pathname === '/api/count') {
    const row = await env.DB.prepare('SELECT pageviews FROM site_stats WHERE id = 1').first();
    if (!row) throw new Error('Missing stats');
    return response({ pageviews: row.pageviews }, 200, origin);
  }
  if (!origin) return error('Origin required', 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) {
    return error('JSON required', 415, origin);
  }
  const ip = clientIp(request);
  if (!ip) return error('Client address unavailable', 400, origin);
  let body;
  try { body = await readVisitBody(request); }
  catch { return error('Invalid request body', 400, origin); }
  if (!body || Array.isArray(body) || !validPath(body.path, settings.prefix)) return error('Invalid page path', 400, origin);

  // D1 batch is one transaction: increment, deduplicate, and evict all succeed or roll back.
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE site_stats SET pageviews = pageviews + 1 WHERE id = 1 RETURNING pageviews'),
    env.DB.prepare(`INSERT INTO recent_visitors (ip, last_seen, last_sequence)
      VALUES (?, ?, (SELECT pageviews FROM site_stats WHERE id = 1))
      ON CONFLICT(ip) DO UPDATE SET last_seen = excluded.last_seen, last_sequence = excluded.last_sequence`)
      .bind(ip, Date.now()),
    env.DB.prepare('DELETE FROM recent_visitors WHERE ip NOT IN (SELECT ip FROM recent_visitors ORDER BY last_sequence DESC LIMIT 10)'),
  ]);
  const row = results[0].results[0];
  if (!row) throw new Error('Missing stats');
  return response({ pageviews: row.pageviews }, 200, origin);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch {
      // Deliberately avoid logging requests, IPs, authorization headers, or SQL errors.
      let origin = null;
      try { const candidate = request.headers.get('Origin'); if (config(env).origins.has(candidate)) origin = candidate; } catch {}
      return error('Analytics temporarily unavailable', 503, origin);
    }
  },
};
