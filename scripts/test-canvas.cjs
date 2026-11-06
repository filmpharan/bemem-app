// No extra test dependencies. These tests run on Node, NOT on an Android device.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const project = path.resolve(__dirname, '..');
const cache = new Map();

function loadTs(relative) {
  const filename = path.resolve(project, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = name => name.startsWith('.')
    ? loadTs(path.relative(project, path.resolve(path.dirname(filename), `${name}.ts`))) : require(name);
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const { PREVIEW_CARDS: cards, INITIAL_LAYOUT: initial } = loadTs('src/data/wallet-preview.ts');
const { canPlace, cloneLayout, sameLayout, validateLayout, canvasMetrics, cardSize, dropPosition } = loadTs('src/lib/canvas-layout.ts');
const { canvasSession: reduce, initialSession } = loadTs('src/lib/canvas-session.ts');
const { createCanvasRepository } = loadTs('src/lib/canvas-repository.ts');
const { backAction, primaryHeaderAction } = loadTs('src/lib/phase1-navigation.ts');

function diskFiles(directory) {
  return {
    list: async () => fs.readdirSync(directory),
    read: async name => fs.readFileSync(path.join(directory, name), 'utf8'),
    commit: async (name, text) => {
      const pending = path.join(directory, `${name}.pending`);
      fs.writeFileSync(pending, text);
      assert.equal(fs.readFileSync(pending, 'utf8'), text);
      fs.renameSync(pending, path.join(directory, name));
    },
  };
}

if (process.argv[2] === '--prepare-restart') {
  const directory = fs.mkdtempSync(path.join(project, '.expo', 'canvas-restart-'));
  createCanvasRepository(diskFiles(directory), cards).save({ ...initial, [cards[0].id]: { col: 0, row: 14 } }, 0)
    .then(() => process.stdout.write(directory))
    .catch(error => { process.stderr.write(error.message); process.exitCode = 1; });
} else if (process.argv[2] === '--verify-restart') {
  createCanvasRepository(diskFiles(process.argv[3]), cards).load()
    .then(doc => {
      assert.equal(doc.revision, 1);
      assert.deepEqual(doc.layout[cards[0].id], { col: 0, row: 14 });
      const session = reduce(initialSession(initial), { type: 'load', document: doc });
      assert.equal(session.mode, 'home');
      process.stdout.write('PASS: independent Node process loaded the saved JSON and started at Home');
    })
    .catch(error => { process.stderr.write(error.message); process.exitCode = 1; });
} else if (process.argv[2] === '--read') {
  createCanvasRepository(diskFiles(process.argv[3]), cards).load()
    .then(doc => process.stdout.write(JSON.stringify(doc)))
    .catch(error => { process.stderr.write(error.message); process.exitCode = 1; });
} else {
  fs.mkdirSync(path.join(project, '.expo'), { recursive: true });
  function temp(t) {
    const directory = fs.mkdtempSync(path.join(project, '.expo', 'canvas-tests-'));
    t.after(() => {
      // Every recursive deletion is confined to this test's verified app-local directory.
      assert.ok(path.resolve(directory).startsWith(path.join(project, '.expo') + path.sep));
      fs.rmSync(directory, { recursive: true, force: true });
    });
    return directory;
  }
  function movedSession() {
    let state = reduce(initialSession(initial), { type: 'enter' });
    return reduce(state, { type: 'move', id: cards[0].id, position: { col: 0, row: 14 }, cards });
  }

  test('Header enters Create from Home; Create PRO only opens an overlay over the existing draft', () => {
    assert.equal(primaryHeaderAction('home'), 'enter-create');
    const state = movedSession();
    assert.equal(primaryHeaderAction(state.mode), 'open-pro');
    assert.equal(backAction({ mode: state.mode, proOpen: true, searchOpen: false, blocked: false }), 'close-pro');
    assert.equal(state.mode, 'create');
    assert.ok(!sameLayout(state.saved, state.draft));
  });

  test('Header/Android Back delegates clean and dirty Create exits to the existing session guard', () => {
    for (const state of [reduce(initialSession(initial), { type: 'enter' }), movedSession()]) {
      const action = backAction({ mode: state.mode, proOpen: false, searchOpen: false, blocked: false });
      assert.equal(action, 'leave-create');
      const next = reduce(state, { type: 'leave' });
      const dirty = !sameLayout(state.saved, state.draft);
      assert.equal(next.mode, dirty ? 'create' : 'home');
      assert.equal(next.exitPrompt, dirty);
      assert.deepEqual(next.saved, state.saved);
      assert.deepEqual(next.draft, state.draft);
    }
  });

  test('Back is blocked during Save/drag; Home closes search before delegating to native navigation', () => {
    for (const mode of ['home', 'create']) {
      assert.equal(backAction({ mode, proOpen: false, searchOpen: false, blocked: true }), 'blocked');
    }
    assert.equal(backAction({ mode: 'home', proOpen: false, searchOpen: true, blocked: false }), 'close-search');
    assert.equal(backAction({ mode: 'home', proOpen: false, searchOpen: false, blocked: false }), 'system-back');
  });

  test('Exit Save stays in Create until the repository commit finishes, then returns Home', async t => {
    const state = reduce(movedSession(), { type: 'leave' });
    const files = diskFiles(temp(t));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const repo = createCanvasRepository({ ...files, commit: async (...args) => { await gate; await files.commit(...args); } }, cards);
    let current = state;
    const pending = repo.save(state.draft, state.revision).then(document => { current = reduce(current, { type: 'saved', document }); });
    assert.equal(current.mode, 'create');
    assert.deepEqual(current.saved, initial);
    release();
    await pending;
    assert.equal(current.mode, 'home');
    assert.deepEqual(current.saved, state.draft);
  });

  test('Home ignores moves; Create edits draft without changing saved layout', () => {
    const home = initialSession(initial);
    const ignored = reduce(home, { type: 'move', id: cards[0].id, position: { col: 0, row: 14 }, cards });
    assert.equal(ignored, home);
    const state = movedSession();
    assert.deepEqual(state.saved, initial);
    assert.ok(!sameLayout(state.saved, state.draft));
    assert.notEqual(state.saved[cards[0].id], state.draft[cards[0].id]);
  });

  test('Cancel keeps draft and Create; Discard restores latest saved layout', () => {
    const state = movedSession();
    const prompt = reduce(state, { type: 'leave' });
    assert.equal(prompt.exitPrompt, true);
    const cancelled = reduce(prompt, { type: 'cancel' });
    assert.equal(cancelled.mode, 'create');
    assert.deepEqual(cancelled.draft, state.draft);
    const discarded = reduce(cancelled, { type: 'discard' });
    assert.equal(discarded.mode, 'home');
    assert.deepEqual(discarded.draft, initial);
  });

  test('Save failure preserves draft, saved layout and revision', () => {
    const state = movedSession();
    const failed = reduce(reduce(state, { type: 'leave' }), { type: 'saveFailed' });
    assert.equal(failed.mode, 'create');
    assert.deepEqual(failed.saved, initial);
    assert.deepEqual(failed.draft, state.draft);
    assert.equal(failed.revision, 0);
  });

  test('Overlapping, non-finite and out-of-bounds placements are rejected', () => {
    assert.deepEqual(validateLayout(initial, cards), initial);
    assert.equal(canPlace(cards[0], { col: 7, row: 0 }, cards, initial), false);
    for (const position of [{ col: -1, row: 0 }, { col: 12, row: 0 }, { col: 0, row: 240 }, { col: NaN, row: 0 }, { col: 0.5, row: 0 }]) {
      assert.equal(canPlace(cards[0], position, cards, initial), false);
    }
    assert.throws(() => validateLayout({}, cards));
    assert.throws(() => validateLayout({ ...initial, extra: { col: 0, row: 0 } }, cards));
  });

  test('Mixed orientations remain in bounds and disjoint at different viewport widths', () => {
    for (const width of [248, 288, 328, 368, 568]) {
      const { unit, height } = canvasMetrics(width, 500, cards, initial, false);
      for (const card of cards) {
        const p = initial[card.id];
        const s = cardSize(card);
        assert.ok((p.col + s.cols) * unit <= width + 0.0001);
        assert.ok((p.row + s.rows) * unit <= height);
        assert.ok(canPlace(card, p, cards, initial));
        assert.equal(dropPosition(card, p, 0, 0, unit).col, p.col);
      }
    }
  });

  test('Load/Discard/Cancel never write; draft changes are lost on a fresh session', async t => {
    const directory = temp(t);
    let commits = 0;
    const files = diskFiles(directory);
    const repo = createCanvasRepository({ ...files, commit: async (...args) => { commits++; return files.commit(...args); } }, cards);
    assert.equal(await repo.load(), null);
    const state = movedSession();
    reduce(state, { type: 'cancel' }); reduce(state, { type: 'discard' });
    assert.deepEqual(initialSession(initial).draft, initial);
    assert.equal(commits, 0);
    assert.deepEqual(fs.readdirSync(directory), []);
  });

  test('Save persists JSON; a new repository reloads the exact saved layout', async t => {
    const directory = temp(t);
    const repo = createCanvasRepository(diskFiles(directory), cards);
    const doc = await repo.save(movedSession().draft, 0);
    assert.equal(doc.schemaVersion, 1);
    assert.equal(doc.columns, 12);
    const loaded = await createCanvasRepository(diskFiles(directory), cards).load();
    assert.deepEqual(loaded, doc);
    const restored = reduce(initialSession(initial), { type: 'load', document: loaded });
    assert.equal(restored.mode, 'home');
    assert.deepEqual(restored.saved, doc.layout);
    assert.deepEqual(reduce(movedSession(), { type: 'saved', document: loaded }).draft, doc.layout);
  });

  test('A second save retains the preceding commit and loads the highest revision', async t => {
    const directory = temp(t);
    const files = diskFiles(directory);
    const repo = createCanvasRepository(files, cards);
    const first = await repo.save(initial, 0);
    const original = await files.read('layout-0000000001.json');
    const second = await repo.save(movedSession().draft, first.revision);
    assert.equal(second.revision, 2);
    assert.equal(await files.read('layout-0000000001.json'), original);
    assert.deepEqual(await repo.load(), second);
  });

  test('Corrupt/unknown-schema latest commit blocks loading and writing without overwriting', async t => {
    const directory = temp(t);
    const files = diskFiles(directory);
    const repo = createCanvasRepository(files, cards);
    await repo.save(initial, 0);
    const committed = await files.read('layout-0000000001.json');
    for (const damaged of ['{broken', JSON.stringify({ schemaVersion: 99 })]) {
      fs.writeFileSync(path.join(directory, 'layout-0000000002.json'), damaged);
      await assert.rejects(repo.load());
      await assert.rejects(repo.save(initial, 1));
      assert.equal(await files.read('layout-0000000002.json'), damaged);
      assert.equal(await files.read('layout-0000000001.json'), committed);
    }
  });

  test('Failed commit and interrupted pending write retain the last saved layout', async t => {
    const directory = temp(t);
    const files = diskFiles(directory);
    await createCanvasRepository(files, cards).save(initial, 0);
    const failing = createCanvasRepository({ ...files, commit: async () => { throw new Error('Disk full'); } }, cards);
    await assert.rejects(failing.save(movedSession().draft, 1), /Disk full/);
    fs.writeFileSync(path.join(directory, 'layout-0000000002.json.interrupted.pending'), '{partial');
    assert.deepEqual((await createCanvasRepository(files, cards).load()).layout, initial);
  });

  test('Unreadable storage and stale revisions cannot produce successful saves', async t => {
    const directory = temp(t);
    const files = diskFiles(directory);
    const repo = createCanvasRepository(files, cards);
    await repo.save(initial, 0);
    await assert.rejects(repo.save(initial, 0), /changed/);
    const unreadable = createCanvasRepository({ ...files, read: async () => { throw new Error('Permission denied'); } }, cards);
    await assert.rejects(unreadable.load(), /Permission denied/);
    await assert.rejects(unreadable.save(initial, 1), /Permission denied/);
    assert.equal(fs.readdirSync(directory).length, 1);
  });

  test('Concurrent saves are rejected and empty fixtures validate independently', async t => {
    const directory = temp(t);
    const repo = createCanvasRepository(diskFiles(directory), cards);
    const first = repo.save(cloneLayout(initial), 0);
    await assert.rejects(repo.save(initial, 0), /progress/);
    await first;
    assert.deepEqual(validateLayout({}, []), {});
  });
}
