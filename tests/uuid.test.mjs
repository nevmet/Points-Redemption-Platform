import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("../src/lib/uuid.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("HTTP preview without randomUUID still creates unique valid v4 identifiers", () => {
  const exports = {};
  runInNewContext(code, { exports, crypto: { getRandomValues: array => webcrypto.getRandomValues(array) } });
  const ids = Array.from({ length: 1000 }, () => exports.createUuid());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
