/* Run with the already installed Playwright CLI: run-code --filename <this file>.
 * Local design verification only. The browser never opens the Expo app or wallet.
 */
async (page) => {
  const results = [];
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const base = 'http://127.0.0.1:8791/';
  for (const concept of ['a', 'b', 'c']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}${concept}.html`);
    await page.evaluate(() => document.fonts.ready);
    if (concept === 'b') {
      assert(!await page.locator('#scan').isVisible(), 'B must begin with its card, not a code');
    } else assert(await page.locator('#scan').isVisible(), `${concept} code visible immediately`);
    await page.screenshot({ path: `output/playwright/detail-${concept}.png` });
    if (concept === 'b') await page.getByRole('button', { name: 'Show code', exact: true }).click();
    assert(await page.locator('#scan').isVisible(), 'Scan area reachable');
    await page.getByRole('button', { name: 'QR Code', exact: true }).click();
    assert(await page.locator('.code-label').textContent() === 'QR Code', 'QR tap');
    const qr = await page.locator('.qr').boundingBox();
    assert(qr.width >= 197 && qr.height >= 197, 'QR is not shrunk for compact mode');
    await page.getByRole('button', { name: 'Code 128', exact: true }).click();
    const box = await page.locator('.scan-frame').boundingBox();
    const x = box.x + box.width * .73, y = box.y + box.height * .5;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x - 100, y, { steps: 8 }); await page.mouse.up();
    assert(await page.locator('.code-label').textContent() === 'QR Code', 'Horizontal pointer swipe');
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x - 70, y + 60, { steps: 8 }); await page.mouse.up();
    assert(await page.locator('.code-label').textContent() === 'QR Code', 'Diagonal scroll must not switch');
    await page.getByRole('button', { name: 'Code 128', exact: true }).click();
    const touch = await page.context().newCDPSession(page);
    const touchBox = await page.locator('.scan-frame').boundingBox();
    const tx = touchBox.x + touchBox.width * .73, ty = touchBox.y + touchBox.height * .5;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
    for (let step = 1; step <= 8; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tx - step * 12, y: ty }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert(await page.locator('.code-label').textContent() === 'QR Code', 'Emulated touch swipe');
    await touch.detach();
    await page.locator('.scan-frame').focus(); await page.keyboard.press('ArrowRight');
    assert(await page.locator('.code-label').textContent() === 'Code 128', 'Keyboard alternative');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    assert(await page.locator('.artwork').getAttribute('data-side') === 'back', 'Back tap');
    await page.getByRole('button', { name: 'Front', exact: true }).click();
    assert(await page.locator('.artwork').getAttribute('data-side') === 'front', 'Front tap');
    await page.locator('.sheet-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; });
    assert(await page.getByLabel('Card History and Receipts. Coming soon', { exact: true }).isVisible(), 'History reachable');
    const hits = await page.locator('.sheet button').evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => ({ text: el.textContent, w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height })));
    assert(hits.every(b => b.w >= 47.9 && b.h >= 47.9), '48px button minimum');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    assert(!await page.getByRole('dialog').isVisible(), 'Close');
    await page.getByRole('button', { name: /^Reopen/ }).click();
    assert(await page.getByRole('dialog').isVisible(), 'Reopen');
    await page.keyboard.press('Escape'); assert(!await page.getByRole('dialog').isVisible(), 'Escape');
    results.push(`${concept.toUpperCase()}: initial hierarchy, tap, pointer/touch swipe, scroll rejection, keyboard, Front/Back, close/reopen, hit areas passed`);
    for (const viewport of [{ width: 320, height: 640 }, { width: 375, height: 812 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${base}${concept}.html?orientation=portrait`);
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert(!overflow, `No horizontal page overflow ${concept} ${viewport.width}`);
      const dims = await page.locator('.artwork').boundingBox();
      assert(Math.abs(dims.width / dims.height - 4 / 6) < .01, 'Portrait ratio');
      if (concept === 'b') await page.getByRole('button', { name: 'Show code', exact: true }).click();
      await page.getByRole('button', { name: 'QR Code', exact: true }).click();
      const smallQr = await page.locator('.qr').boundingBox(); assert(smallQr.width >= 197, 'QR small-screen size');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}${concept}.html`);
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), '200% text overflow');
    const enlarged = await page.locator('.sheet button').evaluateAll(els => els.filter(el => el.getClientRects().length).map(el => el.scrollWidth <= el.clientWidth + 2));
    assert(enlarged.every(Boolean), '200% button labels fit');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Close card detail' }).click();
    results.push(`${concept.toUpperCase()}: 320 / 375 / landscape, portrait card, 200% text and reduced-motion close passed`);
  }
  await page.setViewportSize({ width: 1440, height: 1160 });
  await page.goto(base + 'index.html');
  await page.evaluate(() => document.fonts.ready);
  for (const frame of page.frames().slice(1)) await frame.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'output/playwright/detail-comparison.png', fullPage: true });
  await page.locator('#orientation').selectOption('portrait');
  for (const frame of page.frames().slice(1)) {
    await frame.waitForSelector('.artwork.portrait');
    assert(await frame.locator('.member-number').textContent() === '00123456', 'Identical data');
  }
  results.push('Comparison: all three frames change orientation with identical fixture data');
  return results;
}
