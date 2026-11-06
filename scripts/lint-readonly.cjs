// Optional lint using tools ALREADY installed elsewhere. Never installs or writes there.
// node scripts/lint-readonly.cjs ../pixel-perfect-replay-4296-main
const path = require('node:path');
const { createRequire } = require('node:module');

async function main() {
  if (!process.argv[2]) throw new Error('Pass a directory with existing ESLint/TypeScript ESLint tools. Nothing will be installed.');
  const tools = createRequire(path.resolve(process.argv[2], 'package.json'));
  const { ESLint } = tools('eslint');
  const js = tools('@eslint/js');
  const ts = tools('typescript-eslint');
  const hooks = tools('eslint-plugin-react-hooks');
  const globals = tools('globals');
  const eslint = new ESLint({
    cwd: path.resolve(__dirname, '..'),
    overrideConfigFile: true,
    cache: false,
    overrideConfig: ts.config({
      files: ['**/*.{ts,tsx}'],
      extends: [js.configs.recommended, ...ts.configs.recommended],
      languageOptions: { globals: { ...globals.browser, ...globals.node } },
      plugins: { 'react-hooks': hooks },
      rules: { ...hooks.configs.recommended.rules },
    }),
  });
  // Limit to Phase 1 code and the template component touched for SDK 58 compatibility.
  const results = await eslint.lintFiles([
    'src/app/**/*.{ts,tsx}', 'src/components/bemem/**/*.{ts,tsx}',
    'src/components/app-tabs.web.tsx', 'src/constants/bemem-theme.ts',
    'src/data/**/*.ts', 'src/hooks/use-wallet-canvas.ts', 'src/lib/**/*.ts', 'src/types/**/*.ts',
  ]);
  const formatter = await eslint.loadFormatter('stylish');
  const output = formatter.format(results);
  if (output) process.stdout.write(output);
  const errors = results.reduce((sum, r) => sum + r.errorCount, 0);
  const warnings = results.reduce((sum, r) => sum + r.warningCount, 0);
  console.log(`Read-only ESLint: ${results.length} files, ${errors} errors, ${warnings} warnings`);
  if (errors || warnings) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
