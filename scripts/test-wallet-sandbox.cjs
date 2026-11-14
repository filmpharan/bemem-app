// Mock-only tests of the SAME sandbox/check runner used on-device. No native result claims.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function environment(dev = true) {
  const data = new Map(), dirs = new Set(['documents']), calls = [], cache = new Map();
  const prefix = 'documents/bemem-wallet-v2-test';
  function touched(uri, operation) {
    assert.ok(uri === prefix || uri.startsWith(prefix + '/'), `Protected path accessed by ${operation}`);
    calls.push([operation, uri]);
  }
  class Directory {
    constructor(parent, name) { this.uri = parent.uri + '/' + name; this.name = name; }
    create() { touched(this.uri, 'mkdir'); dirs.add(this.uri); }
    list() {
      touched(this.uri, 'list');
      if (!dirs.has(this.uri)) throw Error('Missing');
      const output = [];
      for (const uri of dirs) if (uri.slice(0, uri.lastIndexOf('/')) === this.uri) output.push(new Directory(this, uri.split('/').at(-1)));
      for (const uri of data.keys()) if (uri.slice(0, uri.lastIndexOf('/')) === this.uri) output.push(new File(this, uri.split('/').at(-1)));
      return output;
    }
    delete() { touched(this.uri, 'delete-directory'); assert.equal(this.list().length, 0); dirs.delete(this.uri); }
  }
  class File {
    constructor(parent, name) { this.uri = parent.uri + '/' + name; this.name = name; }
    create(options) { touched(this.uri, 'create'); if (!options.overwrite && data.has(this.uri)) throw Error('Exists'); data.set(this.uri, ''); }
    async write(text) { touched(this.uri, 'write'); data.set(this.uri, text); }
    async text() { touched(this.uri, 'read'); if (!data.has(this.uri)) throw Error('Missing'); return data.get(this.uri); }
    async move(destination, options) {
      touched(this.uri, 'move-source'); touched(destination.uri, 'move-target');
      assert.equal(options.overwrite, false); if (data.has(destination.uri)) throw Error('Exists');
      data.set(destination.uri, data.get(this.uri)); data.delete(this.uri);
    }
    delete() { touched(this.uri, 'delete'); data.delete(this.uri); }
  }
  const mocks = { expo: { Platform: { OS: 'android' } }, 'expo-file-system': { Directory, File, Paths: { document: { uri: 'documents' } } } };
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    function dependency(name) {
      if (name in mocks) return mocks[name];
      assert.ok(name.startsWith('.'));
      return load(path.resolve(path.dirname(file), name + '.ts'));
    }
    vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`)(dependency, module, module.exports, dev);
    return module.exports;
  }
  const { createWalletTestSandbox } = load('src/lib/dev-wallet-sandbox.ts');
  const checks = load('src/lib/dev-wallet-checks.ts');
  let id = 0;
  return { data, dirs, calls, prefix, checks, sandbox: createWalletTestSandbox(), token: () => `mock-${++id}` };
}

test('Opening/constructing the sandbox performs no I/O; DEV false blocks every action', async () => {
  const e = environment();
  e.sandbox.path(); e.sandbox.files('main'); assert.equal(e.calls.length, 0);
  const prod = environment(false);
  assert.throws(() => prod.sandbox.path(), /development_only/);
  assert.throws(() => prod.sandbox.files('main'), /development_only/);
  await assert.rejects(prod.sandbox.create(), /development_only/);
  await assert.rejects(prod.sandbox.clear(), /development_only/);
  await assert.rejects(prod.checks.runWalletDeviceChecks(prod.sandbox, prod.token, 'a', () => {}), /development_only/);
  assert.equal(prod.calls.length, 0);
});

test('Manual runner exercises pending, move, revisions, conflict and corruption only inside sandbox', async () => {
  const e = environment(), results = [];
  e.data.set('documents/bemem-wallet-v2/private.json', 'protected-v2');
  e.data.set('documents/bemem-phase1-canvas/private.json', 'protected-v1');
  await e.checks.runWalletDeviceChecks(e.sandbox, e.token, 'session-a', r => results.push(r));
  assert.equal(results.filter(r => r.status === 'Failed').length, 0);
  assert.equal(results.filter(r => r.status === 'Passed').length, 7);
  assert.equal(results.filter(r => r.status === 'Not Verified').length, 3);
  assert.ok(e.calls.some(c => c[0] === 'move-target'));
  assert.equal(e.data.get('documents/bemem-wallet-v2/private.json'), 'protected-v2');
  assert.equal(e.data.get('documents/bemem-phase1-canvas/private.json'), 'protected-v1');
  // Run again without clearing: committed revisions/pending evidence remain usable.
  const second = [];
  await e.checks.runWalletDeviceChecks(e.sandbox, e.token, 'session-a', r => second.push(r));
  assert.equal(second.some(r => r.status === 'Failed'), false);
});

test('Restart verification rejects same-session claims and reads exact saved revision in a changed session', async () => {
  const e = environment();
  await e.checks.runWalletDeviceChecks(e.sandbox, e.token, 'session-a', () => {});
  const before = new Map(e.data);
  assert.equal((await e.checks.verifyWalletTestRestart(e.sandbox, e.token, 'session-a')).status, 'Not Verified');
  assert.equal((await e.checks.verifyWalletTestRestart(e.sandbox, e.token, 'session-b')).status, 'Passed');
  assert.deepEqual(e.data, before);
});

test('Cleanup preflights unknown entries, then deletes only recognized test files after explicit invocation', async () => {
  const e = environment();
  await e.checks.runWalletDeviceChecks(e.sandbox, e.token, 'session-a', () => {});
  e.data.set(e.prefix + '/main/unrecognized.txt', 'do-not-delete');
  const before = new Map(e.data);
  await assert.rejects(e.sandbox.clear(), /cleanup_blocked/);
  assert.deepEqual(e.data, before);
  e.data.delete(e.prefix + '/main/unrecognized.txt');
  e.data.set('documents/bemem-wallet-v2/private.json', 'untouched');
  await e.sandbox.clear();
  assert.deepEqual([...e.data.keys()], ['documents/bemem-wallet-v2/private.json']);
  assert.ok(e.dirs.has(e.prefix));
});

test('Path traversal, committed direct writes and unknown test cases are rejected before I/O', async () => {
  const e = environment(), files = e.sandbox.files('main');
  assert.throws(() => e.sandbox.files('../bemem-wallet-v2'));
  await assert.rejects(files.read('../bemem-wallet-v2/private.json'));
  await assert.rejects(files.writeExclusive('wallet-0000000000000001.json', '{}'));
  assert.equal(e.calls.length, 0);
});

test('The developer route redirects to Home in production and only renders the tool in DEV', () => {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/dev-wallet-test.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  for (const dev of [false, true]) {
    const module = { exports: {} };
    const dependency = name => {
      if (name === 'expo-router') return { Redirect: 'Redirect' };
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      return { WalletTestHarness: 'WalletTestHarness' };
    };
    vm.runInThisContext(`(function(require,module,exports,__DEV__){${code}\n})`)(dependency, module, module.exports, dev);
    const result = module.exports.default();
    assert.equal(result.type, dev ? 'WalletTestHarness' : 'Redirect');
    if (!dev) assert.equal(result.props.href, '/');
  }
});
