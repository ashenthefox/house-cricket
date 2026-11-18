// "Report a bug" (gh-feedback, link mode). The button shows in Pause and Settings only once
// publishing fills in the element's repo. Ctrl+Shift+F is wired in index.html (before the game).
// While the form is open the game ignores its own input; the pad's right button closes it.
const KEY = 'housecricket.v1.feedback';
const FEEDBACK = 'on';

export function setupFeedback({ canvas, input, getState, pause }) {
  const fb = document.getElementById('report');
  const q = new URLSearchParams(location.search);
  if (q.has('feedback')) { try { if (q.get('feedback') === 'off') localStorage.removeItem(KEY); else localStorage.setItem(KEY, '1'); } catch { /* ignore */ } }
  const showReport = () => !!fb?.getAttribute('repo') && (FEEDBACK === 'on' || (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })());

  // the screenshot: what the player saw, taken as the game pauses
  let pauseShot = null;
  const grab = () => new Promise((r) => { try { canvas.toBlob(r, 'image/png'); } catch { r(null); } });
  const snapshot = () => { pauseShot = grab(); };
  const clearShot = () => { pauseShot = null; };

  const errors = [];
  const keep = (m) => { errors.push(String(m).replace(/\s+/g, ' ').slice(0, 200)); errors.splice(0, errors.length - 5); };
  addEventListener('error', (e) => keep(e.message));
  addEventListener('unhandledrejection', (e) => keep(e.reason?.message ?? e.reason));
  const flat = (v) => String(v ?? '').replace(/\s+/g, ' ');

  if (fb) {
    fb.getScreenshot = () => pauseShot ?? grab();
    fb.getContext = () => {
      const s = getState() || {};
      return {
        game: 'House Cricket',
        address: location.origin + location.pathname,
        updated: document.lastModified,
        build: window.desktop ? `desktop app (${window.desktop.platform})` : 'web',
        browser: navigator.userAgent,
        screen: `${innerWidth}x${innerHeight} @${devicePixelRatio}x`,
        zone: flat(s.zone), room: flat(s.room),
        position: s.pos ? `${Math.round(s.pos.x)},${Math.round(s.pos.y)}` : '',
        trio: flat((s.trio || []).join(' ')), out_front: flat(s.active),
        items: flat((s.items || []).join(' ')), rescues: flat((s.rescued || []).join(' ')),
        boss_phase: flat(s.bossPhase ?? 'none'),
        input: flat(s.input), controller: flat(s.padId || 'none'),
        play_time: `${Math.round((s.playFrames || 0) / 60)} s`, slot: flat(s.slot),
        state: flat(s.screen),
        errors: errors.join(' | ') || 'none',
      };
    };
    fb.addEventListener('gh-feedback:open', () => input.releaseAll());
    // [polish-T] the form's heading says what the button said ("Report a bug", not the component's "Send Feedback");
    // it re-renders its shadow DOM, so watch it. The warm panel look is meta.css (gh-feedback custom properties, ::part(popup)).
    const retitle = () => { const h2 = fb.shadowRoot?.querySelector('.header h2'); if (h2 && h2.textContent !== 'Report a bug') h2.textContent = 'Report a bug'; const pp = fb.shadowRoot?.querySelector('.popup'); if (pp && pp.getAttribute('aria-label') !== 'Report a bug') pp.setAttribute('aria-label', 'Report a bug'); };
    customElements.whenDefined('gh-feedback').then(() => { retitle(); if (fb.shadowRoot) new MutationObserver(retitle).observe(fb.shadowRoot, { childList: true, subtree: true }); });
    if (window.desktop) fb.openLink = (url) => { window.open(url, '_blank'); return true; };
  }
  window.reportShortcut = () => pause();
  const isOpen = () => !!fb?.isOpen;
  const open = () => { pause(); fb?.open(); };
  const close = () => fb?.close();
  return { fb, showReport, snapshot, clearShot, isOpen, open, close };
}
