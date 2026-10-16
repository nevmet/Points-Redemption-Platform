import * as shippingAddress from "../src/lib/shipping-address.ts";
import * as uuid from "../src/lib/uuid.ts";
import * as specificationDisplay from "../src/lib/product-specification-display.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as productImage from "../src/lib/product-image.ts";

const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const apiCode = compile("../src/lib/api.ts");
const componentCode = compile("../src/components/rewards/PointsLedger.tsx");

test("ledger fetches beyond 1,000 records, scopes every page and never returns partial data on error", async () => {
  const rows = Array.from({ length: 1203 }, (_, i) => ({ id: String(i), type: i % 2 ? "credit" : "debit", points: 1 }));
  const calls = []; let fail = false;
  const client = { from: (table) => {
    assert.equal(table, "point_transactions");
    const query = { select: () => query, order: () => query, eq: (key, value) => { calls.push([key, value]); return query; }, range: async (start, end) => ({ data: rows.slice(start, end + 1), error: fail && start > 0 ? new Error("offline") : null }) };
    return query;
  } };
  const exports = {};
  runInNewContext(apiCode, { exports, require: (name) => {
    if (name === "./shipping-address") return shippingAddress;
    if (name === "./uuid") return uuid;
    if (name === "./product-image") return productImage;
    if (name === "./local-test-client") return { isLocalTestMode: false, ApiError: class extends Error {} };
    assert.equal(name, "./supabase"); return { requireSupabase: () => client };
  } });
  const result = await exports.listPointTransactions("customer-1");
  assert.equal(result.length, 1203);
  assert.deepEqual(calls, Array(3).fill(["customer_id", "customer-1"]));
  assert.equal(result.filter((row) => row.type === "credit").length, 601);
  fail = true;
  await assert.rejects(exports.listPointTransactions("customer-1"), /offline/);
});

const rows = [
  { id: "order", type: "credit", points: 2000, order_point_request_id: "order-1", description: "ORDER-001" },
  { id: "admin-credit", type: "credit", points: 80000, operation_id: "op1", description: "", balance_after: 82000 },
  { id: "gift", type: "debit", points: 9999, description: "Phone / 256GB" },
  { id: "admin-debit", type: "debit", points: 500, operation_id: "op2", description: "Correction" },
  { id: "old1", type: "credit", points: 2, description: "Older credit" },
  { id: "old2", type: "credit", points: 3, description: "Oldest credit" },
].map((row, i) => ({ ...row, customer_id: "me", created_at: `2026-10-13T08:00:0${i}.000Z` }));
function render(filter = "all", error = "", data = rows) {
  let load;
  const exports = {};
  const modules = {
    "react/jsx-runtime": jsx,
    "@/lib/product-specification-display": specificationDisplay,
    react: { useCallback: (fn) => fn, useState: () => [filter, () => {}] },
    "react-i18next": { useTranslation: () => ({ t: (key) => key, i18n: { language: "en" } }) },
    "@/components/ui/button/Button": { default: ({ children }) => createElement("button", {}, children) },
    "@/context/AuthContext": { useAuth: () => ({ user: { id: "me", email: "me@example.test" } }) },
    "@/lib/api": { listMyPointTransactions: async () => [...rows, { ...rows[0], id: "other", customer_id: "other" }] },
    "@/hooks/useRemoteData": { default: (loader, options) => { load = loader; assert.equal(options.pollIntervalMs, 5000); return { data, error, refreshing: false, refresh() {} }; } },
  };
  runInNewContext(componentCode, { exports, require: (name) => { assert.ok(name in modules, name); return modules[name]; } });
  return { html: renderToStaticMarkup(createElement(exports.default)), load };
}
test("all credits and debits render with accurate totals, sources and account isolation", async () => {
  const { html, load } = render();
  assert.equal((html.match(/<li /g) || []).length, 6);
  for (const value of ["+80,000", "−9,999", "−500", "71,506", "82,005", "10,499", "ORDER-001", "Oldest credit", "customerManager.manual", "pointsLedger.order"]) assert.ok(html.includes(value), value);
  const loaded = await load();
  assert.equal(loaded.length, 6);
  assert.equal(loaded[0].id, "old2");
});
test("credit/debit filters retain overall totals, and failure is not displayed as an empty history", () => {
  const credit = render("credit").html, debit = render("debit").html;
  assert.equal((credit.match(/<li /g) || []).length, 4);
  assert.equal((debit.match(/<li /g) || []).length, 2);
  assert.ok(!credit.includes("Phone / 256GB"));
  assert.ok(!debit.includes("ORDER-001"));
  assert.ok(debit.includes("71,506"));
  const failure = render("all", "offline", null).html;
  assert.ok(failure.includes("rewards.pointsSyncFailed"));
  assert.ok(!failure.includes("pointsLedger.empty"));
});
