// Local Edge + built-in Node CDP client. No npm dependencies and no app storage access.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = __dirname;
const project = path.resolve(root, '../..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function main() {
  assert.ok(fs.existsSync(edge), 'Microsoft Edge must already be installed. Nothing is installed by this script.');
  fs.mkdirSync(path.join(project, '.expo'), { recursive: true });
  const profile = fs.mkdtempSync(path.join(project, '.expo', 'bemem-lagoon-browser-'));
  const browser = spawn(edge, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--hide-scrollbars', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
    '--force-device-scale-factor=1', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let launchError;
  browser.on('error', error => { launchError = error; });
  let ws;
  const pending = new Map();
  let sequence = 0;
  const commands = [];
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let attempt = 0; attempt < 150 && !fs.existsSync(portFile); attempt++) {
      if (launchError) throw launchError;
      await pause(100);
    }
    assert.ok(fs.existsSync(portFile), 'Edge debugging endpoint did not start');
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0].trim();
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find(target => target.type === 'page');
    assert.ok(page, 'No isolated browser page');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
    ws.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id && pending.has(message.id)) {
        const { resolve, reject, timeout } = pending.get(message.id);
        clearTimeout(timeout); pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result);
      }
    });
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
        pending.set(id, { resolve, reject, timeout });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    await send('Page.enable');
    await send('Runtime.enable');
    async function visit(name, width, height, fragment = '') {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url: pathToFileURL(path.join(root, name)).href + fragment });
      for (let n = 0; n < 100; n++) {
        if (await evaluate('document.readyState') === 'complete') break;
        await pause(50);
      }
      await evaluate('document.fonts.ready.then(() => true)');
      await pause(180);
    }
    const geometryExpression = `(() => {
      const rect = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
      return {
        viewport:innerWidth, documentWidth:document.documentElement.scrollWidth,
        scripts:document.scripts.length, externalAssets:[...document.querySelectorAll('[src],link[href]')].map(e=>e.getAttribute('src')||e.getAttribute('href')).filter(x=>/^https?:/i.test(x)),
        fontReady:document.fonts.status,
        screens:[...document.querySelectorAll('figure[data-mode]')].map(figure => {
          const phone=figure.querySelector('.phone'), canvas=figure.querySelector('.canvas');
          const controls={};for(const key of ['search','create','create-fab','save']) {const el=figure.querySelector('[data-control="'+key+'"] .gel');if(el)controls[key]=rect(el);}
          return { theme:figure.dataset.theme,mode:figure.dataset.mode,phone:rect(phone),canvas:rect(canvas),controls,
            cards:[...figure.querySelectorAll('.card')].map(c=>({id:c.dataset.cardId,col:Number(c.dataset.col),row:Number(c.dataset.row),rect:rect(c),fontSize:getComputedStyle(c.querySelector('.card-name')).fontSize,art:{fill:getComputedStyle(c).backgroundColor,text:getComputedStyle(c).color,radius:getComputedStyle(c).borderRadius,shadow:getComputedStyle(c).boxShadow,art:getComputedStyle(c.querySelector('.card-art i')).backgroundImage}}))};
        }),
        emptyHomes:[...document.querySelectorAll('[data-scenario="home-empty"]')].filter(el=>el.getBoundingClientRect().width>0).map(el=>({frame:rect(el),fab:rect(el.querySelector('.fab'))}))
      };
    })()`;
    function validateGeometry(result, label, allowWide = false) {
      assert.equal(result.scripts, 0, `${label}: preview must have no runtime script`);
      assert.equal(result.externalAssets.length, 0, `${label}: external asset request`);
      assert.equal(result.fontReady, 'loaded');
      if (!allowWide) assert.ok(result.documentWidth <= result.viewport + 1, `${label}: horizontal overflow ${result.documentWidth}/${result.viewport}`);
      for (const screen of result.screens) {
        const { phone:p, canvas, cards, controls:c } = screen;
        assert.equal(cards.length, 4);
        assert.ok(c.search.x > p.x + p.width/2 - 5, `${label}: Search must stay in Header right`);
        assert.ok(c.create.x > c.search.x && c.create.y < p.y + p.height/3);
        for (const key of ['search','create']) assert.ok(c[key].width >= 47.5 && c[key].height >= 47.5);
        if (screen.mode === 'home') assert.ok(!c['create-fab'] && !c.save);
        else {
          assert.ok(c['create-fab'].x < p.x+p.width/2);
          assert.ok(c.save.x > p.x+p.width/2);
          assert.ok(c.save.y > p.y+p.height*.75);
          assert.ok(c['create-fab'].y > p.y+p.height*.75);
        }
        for (const card of cards) {
          const r=card.rect;
          assert.ok(r.x >= canvas.x-1 && r.right <= canvas.right+1 && r.y >= canvas.y-1);
          assert.ok(r.bottom < p.bottom - 85, `${label}: card obscured by action rail`);
          assert.ok(parseFloat(card.fontSize) >= 12);
        }
        for(let a=0;a<cards.length;a++) for(let b=a+1;b<cards.length;b++) {
          const x=cards[a].rect,y=cards[b].rect;
          assert.ok(x.right<=y.x+.1 || y.right<=x.x+.1 || x.bottom<=y.y+.1 || y.bottom<=x.y+.1, `${label}: cards overlap`);
        }
      }
      for (const empty of result.emptyHomes) {
        assert.ok(empty.fab.x>empty.frame.x+empty.frame.width/2 && empty.fab.y>empty.frame.y+empty.frame.height/2);
      }
    }
    async function screenshot(filename) {
      const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(root, filename), Buffer.from(result.data, 'base64'));
      console.log(filename);
    }
    await visit('contact-sheet.html',2400,1900);
    let data=await evaluate(geometryExpression); validateGeometry(data,'contact-sheet',true);
    const structuralSignatures=await evaluate(`([...document.querySelectorAll('figure[data-mode]')].map(f=>({theme:f.dataset.theme,mode:f.dataset.mode,html:f.querySelector('.phone').innerHTML})))`);
    for(const mode of ['home','create']){const selected=structuralSignatures.filter(s=>s.mode===mode);assert.equal(selected.length,6);for(const s of selected)assert.equal(s.html,selected[0].html,'Palette changed structural HTML');}
    const cardArt=new Map();for(const screen of data.screens){for(const c of screen.cards){if(cardArt.has(c.id))assert.deepEqual(c.art,cardArt.get(c.id),'Theme recolored card artwork');else cardArt.set(c.id,c.art);}}
    const fixtures=JSON.parse(fs.readFileSync(path.join(root,'fixture.json'),'utf8'));
    for(const screen of data.screens) {
      const expected=screen.mode==='home'?fixtures.savedLayout:fixtures.draftLayout;
      for(const card of screen.cards) assert.deepEqual({col:card.col,row:card.row},expected[card.id]);
    }
    commands.push({page:'contact-sheet.html',width:2400,screens:data.screens.length,checks:'PASS'});
    await screenshot('comparison.png');
    for(const name of ['lagoon-mint','blush-pink','warm-beige','lilac-dream','sky-blue','pearl-gray']) {
      await visit(`${name}.html`,1440,1120,'#capture');
      data=await evaluate(geometryExpression); validateGeometry(data,name);
      commands.push({page:`${name}.html#capture`,width:1440,screens:data.screens.length,checks:'PASS'});
      await screenshot(`${name}.png`);
      await visit(`${name}.html`,375,1100);
      data=await evaluate(geometryExpression); validateGeometry(data,`${name}-mobile`);
      commands.push({page:`${name}.html`,width:375,screens:data.screens.length,checks:'PASS'});
    }
    await visit('materials.html',1440,1200);
    const materialMetrics=await send('Page.getLayoutMetrics');
    const materialImage=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:1440,height:Math.ceil(materialMetrics.cssContentSize.height),scale:1}});
    fs.writeFileSync(path.join(root,'materials.png'),Buffer.from(materialImage.data,'base64'));console.log('materials.png');
    commands.push({page:'materials.html',width:1440,checks:'PASS',scope:'browser render; enlarged material and states'});
    await visit('index.html',1440,1000);data=await evaluate(geometryExpression);validateGeometry(data,'index-desktop');
    commands.push({page:'index.html',width:1440,screens:data.screens.length,checks:'PASS'});
    await visit('index.html',375,1100);data=await evaluate(geometryExpression);validateGeometry(data,'index-mobile');
    commands.push({page:'index.html',width:375,screens:data.screens.length,checks:'PASS'});
    fs.writeFileSync(path.join(root,'browser-review.json'),JSON.stringify({date:'2026-11-07',browser:'Microsoft Edge headless / isolated fresh profile',method:'Node built-in WebSocket / Chrome DevTools Protocol; no added dependency',scope:'static previews only; not native device or scan validation',checks:commands},null,2));
    console.log(`PASS: ${commands.length} viewport/page checks; fixture positions, controls, fonts, no scripts, no external assets`);
    // Browser.close closes ONLY this process's dedicated profile, never the user's browser.
    await send('Browser.close').catch(()=>{});
  } finally {
    if (ws) ws.close();
    for (const {timeout} of pending.values()) clearTimeout(timeout);
    if (!browser.killed) browser.kill();
  }
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
