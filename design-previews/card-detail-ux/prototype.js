/* Design-only fixtures. No app imports, encoder, wallet, storage or network access. */
(() => {
  'use strict';
  const concept = document.body.dataset.concept;
  const params = new URLSearchParams(location.search);
  let portrait = params.get('orientation') === 'portrait';
  if (params.has('embed')) document.body.classList.add('embedded');
  const names = { a: 'Scan First', b: 'Card First', c: 'Compact & Swipe' };
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const historyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 11a9 9 0 1 1 3 7M3 5v6h6m3-4v5l3 2"/></svg>';
  const artwork = `<section class="card-section" aria-label="Card preview"><div class="artwork-wrap"><div class="artwork" data-side="front" role="img" aria-label="Test Member card front"><b>Test Member</b><span class="brand">bemem.</span><span class="art-meta">Membership · Sample artwork</span></div></div><div class="front-back" role="group" aria-label="Card side"><button class="glass" data-side="front" aria-pressed="true">Front</button><button class="glass" data-side="back" aria-pressed="false">Back</button></div><p class="size-note">Card 6×4 · Sample artwork</p></section>`;
  const member = `<section class="member-block" aria-label="Membership number"><p class="eyebrow">Membership number</p><p class="member-number">00123456</p>${concept === 'c' ? '<p class="expiry-small">No expiry</p>' : ''}</section>`;
  const switches = `<div class="segmented" role="group" aria-label="Code format"><button class="glass" data-format="qr" aria-pressed="false">QR Code</button><button class="glass" data-format="code128" aria-pressed="true">Code 128</button></div>`;
  const scanner = `<section class="scan-section" id="scan" aria-label="Scan area" ${concept === 'b' ? 'hidden' : ''}><div class="scan-frame" tabindex="0" role="region" aria-label="Code preview. Swipe left for QR, right for Code 128. Arrow keys also work."><span class="code-label">Code 128</span><div class="code-art" aria-hidden="true"></div></div><p class="mock-notice">Visual placeholder · Not scannable</p><p class="scan-hint">Swipe here or tap a format below</p>${concept === 'c' ? '' : switches}</section>`;
  const info = `${concept !== 'c' ? '<div class="info-line"><span>Expiration</span><strong>No expiry</strong></div>' : ''}<div class="coming-soon" aria-label="Share. Coming soon"><div class="coming-label"><p>Share card</p></div><span>Coming soon</span></div><div class="coming-soon" aria-label="Card History and Receipts. Coming soon"><div class="coming-label">${historyIcon}<p>History & Receipts</p></div><span>Coming soon</span></div>`;
  let content;
  if (concept === 'a') content = `${scanner}${member}${artwork}${info}`;
  if (concept === 'b') content = `${artwork}${member}<p class="scan-caption">Your card, ready when you need it.</p>${scanner}${info}`;
  if (concept === 'c') content = `<div class="compact-identity">${artwork}${member}</div>${scanner}${info}`;
  document.querySelector('#app').innerHTML = `<nav class="standalone-toolbar" aria-label="Prototype controls"><a href="index.html">← Compare A / B / C</a><select aria-label="Sample orientation"><option value="landscape">Landscape · Card 6×4</option><option value="portrait" ${portrait ? 'selected' : ''}>Portrait · Card 4×6</option></select></nav><main class="phone concept-${concept}"><div class="wallet-background" inert><p class="wordmark">bemem.</p><div class="background-card"></div><p>Detail closed. Your wallet is unchanged.</p><button class="glass reopen primary">Reopen ${names[concept]}</button></div><div class="dim" aria-hidden="true"></div><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="card-name"><div class="handle" aria-hidden="true"></div><header class="sheet-header"><div class="title-group"><h1 id="card-name">Test Member</h1><p>${concept.toUpperCase()} / ${names[concept]}</p></div><button class="glass icon-button" data-close aria-label="Close card detail">${closeIcon}</button></header><div class="sheet-scroll">${content}</div><footer class="dock">${concept === 'b' ? '<button class="glass primary show-code">Show code</button>' : ''}${concept === 'c' ? switches : ''}<button class="glass footer-close" data-close>Close</button></footer><p class="screen-reader" role="status" aria-live="polite"></p></section></main>`;
  const root = document.querySelector('.phone'), sheet = root.querySelector('.sheet');
  const scroll = root.querySelector('.sheet-scroll'), scan = root.querySelector('.scan-section');
  const frame = root.querySelector('.scan-frame'), status = root.querySelector('[role=status]');
  let format = 'code128', side = 'front';
  function codeIllustration() {
    // Intentionally not an encoded symbol. Quiet margins demonstrate intended geometry only.
    if (format === 'code128') {
      let bars = ''; let x = 24;
      for (let i = 0; i < 44; i++) { const w = 1 + i % 3; bars += `<rect x="${x}" y="10" width="${w}" height="110"/>`; x += w + 2 + i % 2; }
      return `<svg class="barcode" viewBox="0 0 264 132" xmlns="http://www.w3.org/2000/svg"><rect width="264" height="132" fill="#fff"/><g fill="#000">${bars}</g></svg>`;
    }
    let cells = '';
    function finder(x, y) { return `<rect x="${x}" y="${y}" width="7" height="7" fill="#000"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#000"/>`; }
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      if ((x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16)) continue;
      if ((x * 7 + y * 11 + x * y) % 5 < 2) cells += `<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`;
    }
    return `<svg class="qr" viewBox="0 0 33 33" xmlns="http://www.w3.org/2000/svg"><rect width="33" height="33" fill="#fff"/><g fill="#000">${cells}</g>${finder(4, 4)}${finder(22, 4)}${finder(4, 22)}</svg>`;
  }
  function setFormat(next, announce = true) {
    format = next;
    root.querySelector('.code-art').innerHTML = codeIllustration();
    root.querySelector('.code-label').textContent = format === 'qr' ? 'QR Code' : 'Code 128';
    root.querySelectorAll('[data-format]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.format === format)));
    if (announce) status.textContent = `${format === 'qr' ? 'QR Code' : 'Code 128'} selected. Visual placeholder, not scannable.`;
  }
  function setSide(next) {
    side = next;
    const card = root.querySelector('.artwork'); card.dataset.side = side;
    card.setAttribute('aria-label', `Test Member card ${side}`);
    card.innerHTML = side === 'front' ? '<b>Test Member</b><span class="brand">bemem.</span><span class="art-meta">Membership · Sample artwork</span>' : '<span class="art-meta">Test Member · Back</span><span class="back-number">00123456</span><span class="art-meta">No expiry</span>';
    root.querySelectorAll('button[data-side]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.side === side)));
    status.textContent = `Card ${side}`;
  }
  root.querySelectorAll('[data-format]').forEach(b => b.addEventListener('click', () => setFormat(b.dataset.format)));
  root.querySelectorAll('button[data-side]').forEach(b => b.addEventListener('click', () => setSide(b.dataset.side)));
  function dismiss() { sheet.hidden = true; root.querySelector('.dim').hidden = true; const bg = root.querySelector('.wallet-background'); bg.inert = false; bg.querySelector('button').focus(); }
  root.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', dismiss));
  root.querySelector('.dim').addEventListener('click', dismiss);
  root.querySelector('.reopen').addEventListener('click', () => { sheet.hidden = false; root.querySelector('.dim').hidden = false; root.querySelector('.wallet-background').inert = true; sheet.querySelector('[data-close]').focus(); });
  const showCode = root.querySelector('.show-code');
  if (showCode) showCode.addEventListener('click', () => {
    scan.hidden = false;
    scroll.scrollTop = scan.offsetTop - scroll.offsetTop;
    frame.focus({ preventScroll: true });
    showCode.textContent = 'Show code';
    status.textContent = 'Code visible. Visual placeholder, not scannable.';
  });
  document.querySelector('select').addEventListener('change', e => { portrait = e.target.value === 'portrait'; applyOrientation(); });
  function applyOrientation() {
    root.querySelector('.artwork').classList.toggle('portrait', portrait);
    root.querySelector('.size-note').textContent = `${portrait ? 'Card 4×6' : 'Card 6×4'} · Sample artwork`;
  }
  // Only horizontal intent, away from browser/system edges. Vertical movement cancels.
  let start = null;
  frame.addEventListener('pointerdown', e => { if (!e.isPrimary || e.button !== 0 || e.clientX < 24 || e.clientX > innerWidth - 24) return; start = { x: e.clientX, y: e.clientY, id: e.pointerId }; frame.setPointerCapture(e.pointerId); });
  frame.addEventListener('pointermove', e => { if (start && e.pointerId === start.id && Math.abs(e.clientY - start.y) > 18) start = null; });
  frame.addEventListener('pointerup', e => { const s = start; start = null; if (!s || s.id !== e.pointerId) return; const dx = e.clientX - s.x, dy = e.clientY - s.y; if (Math.abs(dx) >= 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) setFormat(dx < 0 ? 'qr' : 'code128'); });
  frame.addEventListener('pointercancel', () => { start = null; });
  frame.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setFormat(e.key === 'ArrowLeft' ? 'qr' : 'code128'); } });
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); return; }
    if (e.key !== 'Tab') return;
    const focusable = [...sheet.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  setFormat('code128', false); applyOrientation();
  sheet.querySelector('[data-close]').focus({ preventScroll: true });
})();
