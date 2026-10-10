/* Minimal test harness that runs identically in the browser (tests/index.html) and in Node (tests/run-node.js). */
(function (g) {
  const tests = [];
  const fmt = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
  g.test = (name, fn) => tests.push({ name, fn });
  g.assert = {
    ok(v, msg) { if (!v) throw new Error(msg || `expected truthy, got ${fmt(v)}`); },
    eq(a, b, msg) { if (a !== b) throw new Error(`${msg ? msg + ': ' : ''}expected ${fmt(b)}, got ${fmt(a)}`); },
    deepEq(a, b, msg) { if (fmt(a) !== fmt(b)) throw new Error(`${msg ? msg + ': ' : ''}expected ${fmt(b)}, got ${fmt(a)}`); },
    near(a, b, tol = 1e-6, msg) { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg ? msg + ': ' : ''}expected ${b} ± ${tol}, got ${a}`); },
    throws(fn, msg) { let threw = false; try { fn(); } catch { threw = true; } if (!threw) throw new Error(msg || 'expected function to throw'); },
  };
  g.runTests = async () => {
    const out = [];
    for (const t of tests) {
      const t0 = Date.now();
      try { await t.fn(); out.push({ name: t.name, ok: true, ms: Date.now() - t0 }); }
      catch (e) { out.push({ name: t.name, ok: false, ms: Date.now() - t0, err: e && e.message ? e.message : String(e) }); }
    }
    return out;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
