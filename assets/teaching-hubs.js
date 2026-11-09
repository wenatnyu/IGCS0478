/* One on-demand embedded presentation per hub, with normal links as a fallback. */
(() => {
  'use strict';
  const panel = document.querySelector('#presentation-preview');
  if (!panel) return;
  const frame = panel.querySelector('iframe');
  const title = panel.querySelector('#preview-title');
  const status = panel.querySelector('[role="status"]');
  const fullscreen = panel.querySelector('[data-preview-fullscreen]');
  let opener;

  document.querySelectorAll('a[data-presentation]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      const card = link.closest('.topic-card');
      const name = card.querySelector('h3').textContent;
      title.textContent = name;
      frame.title = `${name} — lesson presentation`;
      status.textContent = 'Loading presentation…';
      frame.src = link.dataset.presentation;
      panel.querySelector('[data-preview-open]').href = link.href;
      panel.hidden = false;
      title.focus({preventScroll: true});
      panel.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'});
    });
  });
  frame.addEventListener('load', () => { status.textContent = ''; });
  panel.querySelector('[data-preview-close]').addEventListener('click', () => {
    panel.hidden = true;
    frame.removeAttribute('src');
    if (opener) opener.focus();
  });
  if (!document.fullscreenEnabled) fullscreen.hidden = true;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panel.requestFullscreen();
    } catch (_) {
      status.textContent = 'Use “Open in full page” to present in this browser.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
  });
})();
