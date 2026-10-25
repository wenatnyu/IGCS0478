'use strict';
(() => {
  const config = window.IGCS_ANALYTICS;
  const source = document.currentScript?.src;
  if (!config || !source || window.top !== window.self) return;
  const privacyURL = new URL('../privacy.html', source);
  const isPrivacy = location.pathname === privacyURL.pathname;
  const optOutKey = 'igcs0478-analytics-opt-out';
  const browserOptOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const optedOut = () => {
    try { return localStorage.getItem(optOutKey) === '1'; }
    catch { return false; }
  };
  let endpoint;
  try { endpoint = new URL(config.endpoint); } catch { /* Not configured yet. */ }
  const active = config.enabled === true && endpoint?.protocol === 'https:' &&
    !endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash &&
    Array.isArray(config.allowedOrigins) && config.allowedOrigins.includes(location.origin) &&
    typeof config.pathPrefix === 'string' && config.pathPrefix.startsWith('/') &&
    location.pathname.startsWith(config.pathPrefix) && location.protocol === 'https:';

  if (isPrivacy) {
    const state = document.getElementById('analytics-state');
    const button = document.getElementById('analytics-opt-out');
    const update = () => {
      state.textContent = !active ? '本站访问统计尚未启用。' : browserOptOut ? '此浏览器的隐私设置已关闭访问统计。' :
        optedOut() ? '你已在此浏览器关闭访问统计。' : '访问统计已启用。';
      button.textContent = optedOut() ? '允许此浏览器参与统计' : '关闭此浏览器的访问统计';
      button.disabled = !active || browserOptOut;
    };
    button.addEventListener('click', () => {
      try {
        if (optedOut()) localStorage.removeItem(optOutKey);
        else localStorage.setItem(optOutKey, '1');
        update();
      } catch { state.textContent = '此浏览器无法保存设置，请通过浏览器设置阻止统计请求。'; }
    });
    update();
    return;
  }
  if (!active || optedOut() || browserOptOut) return;

  const note = document.createElement('p');
  note.className = 'visitor-notice';
  note.textContent = '访问统计 / Analytics：记录浏览次数及最近 10 个不同 IP。';
  const privacy = document.createElement('a');
  privacy.href = privacyURL.href;
  privacy.textContent = '统计说明与关闭设置 / Privacy & opt out';
  note.append(' ', privacy);
  (document.querySelector('footer') || document.body).append(note);

  const isHome = location.pathname === config.pathPrefix ||
    location.pathname === config.pathPrefix + 'index.html';
  const counter = document.createElement('span');
  if (isHome) {
    counter.className = 'visitor-count';
    counter.setAttribute('role', 'status');
    counter.textContent = '浏览次数 / Page views：读取中…';
    note.prepend(counter, document.createElement('br'));
  }

  // One event per top-level page load. Hash/slide changes and iframes do not count.
  // No client-provided IP, query string, referrer, name or contact information.
  let sent = false;
  const record = async () => {
    if (sent || document.visibilityState === 'hidden') return;
    sent = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(new URL('/api/visit', endpoint), {
        method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        referrerPolicy: 'no-referrer', keepalive: true,
        body: JSON.stringify({ path: location.pathname }), signal: controller.signal
      });
      if (!response.ok) throw new Error('Statistics unavailable');
      const data = await response.json();
      if (!Number.isSafeInteger(data.pageviews) || data.pageviews < 0) throw new Error('Invalid count');
      counter.textContent = '浏览次数 / Page views：' + data.pageviews.toLocaleString();
    } catch {
      // Analytics must never interrupt a lesson or be retried as another visit.
      counter.textContent = '浏览次数暂不可用 / Count unavailable';
    } finally { clearTimeout(timeout); }
  };
  document.addEventListener('visibilitychange', record);
  record();
})();
