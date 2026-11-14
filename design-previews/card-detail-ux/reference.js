/* Reference reconstruction only. Synthetic, deliberately non-encoded code artwork.
 * No production imports, payload encoder, network APIs or persistent storage.
 */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  if (params.has('embed')) document.body.classList.add('embedded');
  const sheet = document.querySelector('.sheet'), device = document.querySelector('.device');
  const panel = document.querySelector('.code-panel'), toggle = document.querySelector('.toggle-code');
  const status = document.querySelector('[role=status]'), card = document.querySelector('.card-art');
  const sampleSelect = document.querySelector('#sample-size');
  const samples = globalThis.BEMEM_GRID_FIXTURES.samples;
  const sampleId = params.get('sample') || (params.get('orientation') === 'portrait' ? 'card-portrait' : 'card-landscape');
  let sample = samples.find(candidate => candidate.id === sampleId);
  if (!sample) throw Error('Unknown preview fixture');
  for (const item of samples) {
    const option = document.createElement('option'); option.value = item.id;
    const size = globalThis.BememGridSize.dimensions(item);
    option.textContent = `${item.sizePresetId ?? 'Legacy ' + item.orientation} · ${size.widthBlocks}×${size.heightBlocks}`;
    sampleSelect.append(option);
  }
  sampleSelect.value = sample.id;
  let format = params.get('format') === 'qr' ? 'qr' : 'code128', back = false;
  const icons = {
    qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 14h2v3h4v4h-3m-6-9h2m-2 8h3m6-8v2M3 12h4"/></svg>',
    code128: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4v16M6 4v16m4-16v16m3-16v16m4-16v16m4-16v16"/></svg>',
  };
  function mockCode() {
    if (format === 'code128') {
      let bars = '', x = 16;
      for (let i = 0; i < 50; i++) { const w = 1 + (i * 7) % 4; bars += `<rect x="${x}" y="0" width="${w}" height="110"/>`; x += w + 1 + i % 3; }
      return `<svg class="barcode" viewBox="0 0 256 110" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="110" fill="#fff"/><g fill="#000">${bars}</g></svg>`;
    }
    let cells = '';
    for (let y = 0; y < 25; y++) for (let x = 0; x < 25; x++) {
      if ((x < 8 && y < 8) || (x > 16 && y < 8) || (x < 8 && y > 16)) continue;
      if ((x * 7 + y * 11 + x * y) % 5 < 2) cells += `<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`;
    }
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#000"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#000"/>`;
    return `<svg class="qr" viewBox="0 0 33 33" xmlns="http://www.w3.org/2000/svg"><rect width="33" height="33" fill="#fff"/><g fill="#000">${cells}</g>${finder(4,4)}${finder(22,4)}${finder(4,22)}</svg>`;
  }
  function setFormat(next, announce = true) {
    format = next; panel.dataset.format = format;
    panel.querySelector('.code-art').innerHTML = mockCode();
    const target = format === 'qr' ? 'Code 128' : 'QR Code';
    toggle.setAttribute('aria-label', `Show ${target}`); toggle.title = `Show ${target}`;
    toggle.querySelector('.button-surface').innerHTML = icons[format === 'qr' ? 'code128' : 'qr'];
    if (announce) status.textContent = `${format === 'qr' ? 'QR Code' : 'Code 128'} selected. Placeholder, not scannable.`;
  }
  toggle.addEventListener('click', () => setFormat(format === 'qr' ? 'code128' : 'qr'));
  document.querySelector('.flip').addEventListener('click', e => {
    back = !back; card.classList.toggle('back', back);
    card.setAttribute('aria-label', `Test Member card ${back ? 'back' : 'front'}`);
    card.querySelector('.card-back-number').hidden = !back;
    document.querySelector('.side-label').textContent = back ? 'Back' : 'Front';
    e.currentTarget.setAttribute('aria-pressed', String(back));
    e.currentTarget.setAttribute('aria-label', `Show card ${back ? 'front' : 'back'}`);
    applySize();
    status.textContent = `Card ${back ? 'back' : 'front'}`;
  });
  const slot = document.querySelector('.card-slot'), footprint = document.querySelector('.card-footprint');
  function applySize() {
    const deviceWidth = device.getBoundingClientRect().width, slotWidth = slot.getBoundingClientRect().width;
    // Closing the modal produces a legitimate zero-size observer notification.
    if (sheet.hidden || deviceWidth <= 32 || slotWidth <= 0) return;
    const metric = globalThis.BememGridSize.metrics(deviceWidth, slotWidth, samples);
    const geometry = globalThis.BememGridSize.frame(sample, metric);
    slot.style.height = `${metric.stageHeight}px`;
    footprint.style.width = `${geometry.footprintWidth}px`; footprint.style.height = `${geometry.footprintHeight}px`;
    card.style.width = `${geometry.paintWidth}px`; card.style.height = `${geometry.paintHeight}px`;
    card.style.left = `${geometry.inset}px`; card.style.top = `${geometry.inset}px`;
    Object.assign(slot.dataset, { sample: sample.id, widthBlocks: String(geometry.widthBlocks), heightBlocks: String(geometry.heightBlocks),
      source: geometry.source, blockUnit: String(metric.blockUnit), scale: String(metric.scale), displayUnit: String(metric.displayUnit) });
    card.setAttribute('aria-label', `Test Member card ${back ? 'back' : 'front'}, ${geometry.widthBlocks} by ${geometry.heightBlocks} blocks`);
    document.querySelector('#size-metrics').textContent = `${geometry.widthBlocks}×${geometry.heightBlocks} blocks · Create unit ${metric.blockUnit.toFixed(2)}px · Shared scale ${metric.scale.toFixed(3)} · ${geometry.source}`;
  }
  sampleSelect.addEventListener('change', () => { sample = samples.find(item => item.id === sampleSelect.value); applySize(); });
  new ResizeObserver(applySize).observe(slot);
  new ResizeObserver(applySize).observe(device);
  applySize();
  function close() { sheet.hidden = true; device.querySelector('.backdrop').hidden = true; device.querySelector('.home').inert = false; device.querySelector('.reopen').focus(); }
  document.querySelector('.close').addEventListener('click', close);
  device.querySelector('.backdrop').addEventListener('click', close);
  device.querySelector('.reopen').addEventListener('click', () => {
    sheet.hidden = false; device.querySelector('.backdrop').hidden = false; device.querySelector('.home').inert = true;
    document.querySelector('.close').focus({ preventScroll: true });
  });
  let start = null;
  panel.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || e.target.closest('button') || e.clientX < 24 || e.clientX > innerWidth - 24) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId }; panel.setPointerCapture(e.pointerId);
  });
  panel.addEventListener('pointermove', e => { if (start && e.pointerId === start.id && Math.abs(e.clientY - start.y) > 18) start = null; });
  panel.addEventListener('pointerup', e => {
    const previous = start; start = null;
    if (!previous || previous.id !== e.pointerId) return;
    const dx = e.clientX - previous.x, dy = e.clientY - previous.y;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) setFormat(dx < 0 ? 'qr' : 'code128');
  });
  panel.addEventListener('pointercancel', () => { start = null; });
  panel.addEventListener('keydown', e => {
    if (e.target !== panel) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setFormat(e.key === 'ArrowLeft' ? 'qr' : 'code128'); }
  });
  sheet.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const controls = [...sheet.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
    if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0].focus(); }
  });
  setFormat(format, false); document.querySelector('#card-title').focus({ preventScroll: true });
})();
