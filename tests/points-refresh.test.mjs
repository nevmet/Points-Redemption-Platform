import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createRemoteRefresh } from "../src/lib/remote-refresh.ts";

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = () => new Promise((done) => setImmediate(done));

test("refresh during a slow request skips its stale balance and fetches the latest once", async () => {
  const pending = [deferred(), deferred()]; let calls = 0; const values = [];
  const controller = createRemoteRefresh(() => pending[calls++].promise, (value) => values.push(value), assert.fail, () => {});
  const done = controller.refresh();
  await controller.refresh(); await controller.refresh();
  assert.equal(calls, 1);
  pending[0].resolve(800); await flush();
  assert.equal(calls, 2); assert.deepEqual(values, []);
  pending[1].resolve(80800); await done;
  assert.deepEqual(values, [80800]); controller.dispose();
});

test("unmounted or switched accounts cannot publish delayed balances", async () => {
  const pending = deferred(); const values = [];
  const old = createRemoteRefresh(() => pending.promise, (value) => values.push(value), assert.fail, () => {});
  const done = old.refresh(); old.dispose();
  const current = createRemoteRefresh(async () => 10, (value) => values.push(value), assert.fail, () => {});
  await current.refresh(); pending.resolve(80000); await done;
  assert.deepEqual(values, [10]); current.dispose();
});

test("background refresh failures preserve data and a later refresh recovers", async () => {
  let failed = false; let balance = 800; const values = []; const errors = [];
  const controller = createRemoteRefresh(async () => { if (failed) throw new Error("offline"); return balance; }, (value) => values.push(value), (error) => errors.push(error.message), () => {});
  await controller.refresh(); failed = true; await controller.refresh();
  assert.deepEqual(values, [800]); assert.deepEqual(errors, ["offline"]);
  failed = false; balance = 70801; await controller.refresh();
  assert.deepEqual(values, [800, 70801]); controller.dispose();
});

test("the hook refreshes visible balances on interval, focus, visibility and reconnect; cleans up listeners", async () => {
  const compiled = ts.transpileModule(readFileSync(new URL("../src/hooks/useRemoteData.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const browser = new EventTarget(); const doc = new EventTarget(); doc.visibilityState = "visible";
  let tick; browser.setInterval = (callback, ms) => { assert.equal(ms, 5000); tick = callback; return 1; };
  browser.clearInterval = () => { tick = undefined; };
  const states = []; let effect; const exports = {};
  const react = {
    useState: (initial) => { const index = states.length; states.push(initial); return [initial, (value) => { states[index] = typeof value === "function" ? value(states[index]) : value; }]; },
    useCallback: (callback) => callback, useRef: (current) => ({ current }), useEffect: (callback) => { effect = callback; },
  };
  runInNewContext(compiled, { exports, window: browser, document: doc, require: (name) => {
    if (name === "react") return react;
    if (name === "@/lib/api") return { apiErrorKey: () => "failed" };
    if (name === "@/lib/remote-refresh") return { createRemoteRefresh };
    throw new Error(name);
  } });
  let balance = 800; let calls = 0; let hold;
  const result = exports.default(async () => { calls++; if (hold) await hold.promise; return balance; }, { pollIntervalMs: 5000, revalidateOnFocus: true });
  const cleanup = effect(); await flush(); assert.equal(states[0].data, 800);
  balance = 80800; tick(); await flush(); assert.equal(states[0].data, 80800);
  doc.visibilityState = "hidden"; const before = calls; tick(); await flush(); assert.equal(calls, before);
  balance = 70801; doc.visibilityState = "visible"; doc.dispatchEvent(new Event("visibilitychange")); await flush(); assert.equal(states[0].data, 70801);
  browser.dispatchEvent(new Event("focus")); await flush();
  browser.dispatchEvent(new Event("online")); await flush();
  result.refresh(); await flush(); assert.equal(calls, before + 4);
  // A slow server must not starve updates or accumulate a request every five seconds.
  hold = deferred(); tick(); const slowCalls = calls;
  tick(); tick(); await flush(); assert.equal(calls, slowCalls);
  balance = 90000; hold.resolve(); await flush(); hold = undefined;
  assert.equal(states[0].data, 90000); assert.equal(calls, slowCalls);
  cleanup(); assert.equal(tick, undefined); const stopped = calls;
  browser.dispatchEvent(new Event("focus")); doc.dispatchEvent(new Event("visibilitychange")); await flush(); assert.equal(calls, stopped);
});
