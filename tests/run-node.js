/* Node test runner: loads core scripts + *.test.js into one sandbox and runs the test harness. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = __dirname;
const root = path.join(dir, '..');
const cfgPath = path.join(dir, 'config.json');
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
const scripts = cfg.scripts || ['src/core.js'];

const ctx = { console, setTimeout, clearTimeout, Intl, URL, URLSearchParams, TextEncoder, TextDecoder, performance, structuredClone, atob, btoa };
ctx.globalThis = ctx;
ctx.window = ctx;
ctx.self = ctx;
for (const [name, pkg] of Object.entries(cfg.npm || {})) {
  ctx[name] = require(require.resolve(pkg, { paths: [process.cwd(), root] }));
}
vm.createContext(ctx);
const load = (file) => vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });

load(path.join(dir, 'harness.js'));
scripts.forEach((s) => load(path.join(root, s)));
fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort().forEach((f) => load(path.join(dir, f)));

ctx.runTests().then((results) => {
  let failed = 0;
  results.forEach((r) => {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : '  ->  ' + r.err}`);
    if (!r.ok) failed++;
  });
  console.log(`\n${results.length - failed}/${results.length} tests passed`);
  process.exit(failed ? 1 : 0);
});
