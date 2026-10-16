import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function localMode(mode, configured, dev = true, hostname = "127.0.0.1") {
  const source = readFileSync(new URL("../src/lib/local-test-client.ts", import.meta.url), "utf8")
    .replaceAll("import.meta.env", "testEnv");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, testEnv: { MODE: mode, DEV: dev }, window: { location: { hostname } }, require: () => ({ isSupabaseConfigured: configured }) });
  return exports.isLocalTestMode;
}

test("missing cloud settings never silently enable demo registration", () => {
  for (const mode of ["development", "cloud", "production"]) {
    for (const configured of [true, false]) assert.equal(localMode(mode, configured), false);
  }
  assert.equal(localMode("demo", false), true);
  assert.equal(localMode("demo", true), false);
  assert.equal(localMode("demo", false, false), false);
  assert.equal(localMode("demo", false, true, "example.com"), false);
});

test("normal development and builds use cloud settings; demo requires a separate command", () => {
  const { scripts } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(scripts.dev, /--mode cloud/);
  assert.match(scripts.build, /--mode cloud/);
  assert.match(scripts["dev:demo"], /--mode demo/);
});
