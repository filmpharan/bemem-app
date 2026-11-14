/* Existing Playwright CLI: run-code --filename <this file>. No wallet access. */
async (page) => {
  const base = 'http://127.0.0.1:8791/';
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const results = [];
  for (const initial of ['code128', 'qr']) {
    await page.setViewportSize({ width: 390, height: 670 });
    await page.goto(`${base}reference.html?format=${initial}`);
    await page.evaluate(() => document.fonts.ready);
    check(await page.locator('.code-panel').getAttribute('data-format') === initial, 'Initial format');
    await page.screenshot({ path: `output/playwright/reference-${initial}.png` });
    const toggle = page.locator('.toggle-code'), graphic = page.locator('.code-art svg');
    const t = await toggle.boundingBox(), g = await graphic.boundingBox();
    check(t.width >= 48 && t.height >= 48, '48px code toggle');
    check(t.y >= g.y + g.height, 'Toggle hit area must not intersect code geometry');
    check(await page.locator('.share').isDisabled(), 'Share truthfully unavailable');
    check(await page.locator('.history').textContent().then(t => t.includes('Coming soon')), 'History truthfully unavailable');
    check(await page.locator('.member-number').textContent() === '00123456', 'Synthetic number');
    check(await page.locator('.identity h1').textContent() === 'Test Member', 'Synthetic name');
    await toggle.click(); check(await page.locator('.code-panel').getAttribute('data-format') !== initial, 'Tap toggle');
    await toggle.click(); check(await page.locator('.code-panel').getAttribute('data-format') === initial, 'Second toggle');
    const cdp = await page.context().newCDPSession(page);
    for (const direction of ['left', 'right']) {
      const b = await page.locator('.code-panel').boundingBox();
      const x = b.x + (direction === 'left' ? .75 : .25) * b.width, y = b.y + 70;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (direction === 'left' ? -1 : 1) * step * 12, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      check(await page.locator('.code-panel').getAttribute('data-format') === (direction === 'left' ? 'qr' : 'code128'), 'Touch swipe direction');
    }
    await cdp.detach();
    const b = await page.locator('.code-panel').boundingBox(), x = b.x + b.width * .7, y = b.y + 70;
    await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x - 70,y + 60,{ steps:8 }); await page.mouse.up();
    check(await page.locator('.code-panel').getAttribute('data-format') === 'code128', 'Diagonal gesture rejected');
    await page.locator('.code-panel').focus(); await page.keyboard.press('ArrowLeft');
    check(await page.locator('.code-panel').getAttribute('data-format') === 'qr', 'Keyboard format alternative');
    await page.getByRole('button', { name: 'Show card back', exact:true }).click();
    check(await page.locator('.side-label').textContent() === 'Back', 'Back label');
    check(await page.locator('.card-back-number').isVisible(), 'Back content');
    await page.getByRole('button', { name: 'Show card front', exact:true }).click();
    check(await page.locator('.side-label').textContent() === 'Front', 'Front label');
    await page.getByRole('button', { name: 'Close card detail' }).click();
    check(!await page.getByRole('dialog').isVisible(), 'Close');
    await page.getByRole('button', { name: 'Reopen Card Detail' }).click();
    check(await page.getByRole('dialog').isVisible(), 'Reopen');
    await page.keyboard.press('Escape'); check(!await page.getByRole('dialog').isVisible(), 'Escape');
    results.push(`${initial}: tap, touch swipe, diagonal rejection, keyboard, Front/Back, Close/Reopen and nonoverlapping 48px toggle passed`);
  }
  for (const size of [{width:320,height:568},{width:375,height:812},{width:390,height:844},{width:844,height:390}]) {
    await page.setViewportSize(size);
    await page.goto(base + 'reference.html?format=qr&orientation=portrait');
    await page.evaluate(() => document.fonts.ready);
    check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'No horizontal page overflow');
    let card = await page.locator('.card-footprint').boundingBox(); check(Math.abs(card.width / card.height - 4/6) < .01, 'Portrait logical footprint ratio');
    const qr = await page.locator('.qr').boundingBox(); check(qr.width >= 197, 'QR geometry retained');
    await page.locator('.detail-content').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.locator('.history').scrollIntoViewIfNeeded();
    check(await page.locator('.history').isVisible(), 'History reachable by scrolling');
  }
  await page.setViewportSize({width:390,height:844}); await page.goto(base + 'reference.html?format=qr');
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), '200% text page overflow');
  check(await page.locator('.identity h1').evaluate(el => el.scrollWidth <= el.clientWidth + 1), '200% title not clipped');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button', {name:'Close card detail'}).click();
  results.push('320/375/390/landscape, portrait ratio, unshrunk QR, internal scroll, 200% title and reduced-motion Close passed');
  await page.setViewportSize({width:1100,height:1500});
  await page.goto(base + 'reference-review.html');
  await page.evaluate(() => document.fonts.ready);
  for (const frame of page.frames().slice(1)) await frame.evaluate(() => document.fonts.ready);
  await page.screenshot({path:'output/playwright/reference-comparison.png',fullPage:true});
  results.push('Both user references and two interactive states captured side by side, without recreating system chrome');
  return results;
}
