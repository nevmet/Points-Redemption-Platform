import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { groupOrderRequests } from "../src/lib/order-request-groups.ts";

const customers = [
  { id: "a", username: "Alice", email: "shared@example.test" },
  { id: "b", username: "Bob", email: "shared@example.test" },
  { id: "empty", username: "No requests", email: "empty@example.test" },
];
const requests = [
  { id: "a1", customer_id: "a", customer_email: "old-alice@example.test", order_number: "ALICE-PENDING", status: "pending", created_at: "2026-10-13T10:00:00Z" },
  { id: "a2", customer_id: "a", customer_email: "old-alice@example.test", order_number: "ALICE-APPROVED", status: "approved", created_at: "2026-10-13T11:00:00Z" },
  { id: "b1", customer_id: "b", customer_email: "shared@example.test", order_number: "BOB-PENDING", status: "pending", created_at: "2026-10-13T10:00:00Z" },
  { id: "b2", customer_id: "b", customer_email: "shared@example.test", order_number: "BOB-PENDING-2", status: "pending", created_at: "2026-10-13T12:00:00Z" },
  { id: "historical", customer_id: "former", customer_email: "former@example.test", order_number: "HISTORY-REJECTED", status: "rejected", created_at: "2026-10-12T10:00:00Z" },
];
test("customer groups use immutable IDs, retain empty/historical customers and prioritize pending reviews", () => {
  const groups = groupOrderRequests(customers, requests);
  assert.equal(groups.length, 4);
  assert.equal(groups[0].id, "b");
  const alice = groups.find((row) => row.id === "a");
  assert.deepEqual(alice.requests.map((row) => row.id), ["a2", "a1"]);
  assert.equal(alice.pending, 1); assert.equal(alice.approved, 1); assert.equal(alice.rejected, 0);
  assert.equal(alice.email, "shared@example.test");
  assert.equal(groups.find((row) => row.id === "empty").requests.length, 0);
  assert.equal(groups.find((row) => row.id === "former").rejected, 1);
  const updated = groupOrderRequests(customers, requests.map((row) => row.id === "a1" ? { ...row, status: "approved" } : row));
  assert.equal(updated.find((row) => row.id === "a").pending, 0);
  assert.equal(updated.find((row) => row.id === "a").approved, 2);
  assert.equal(requests[0].status, "pending");
});

const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const pageCode = compile("../src/pages/Rewards/AdminOrderPoints.tsx");
const listCode = compile("../src/components/rewards/OrderReviewCustomerList.tsx");
function render(selectedId = null, filter = "pending", customerError = "", search = "") {
  let index = 0;
  const state = [selectedId, search, filter, null];
  const modules = {
    "react/jsx-runtime": jsx,
    react: { useState: () => [state[index++], () => {}] },
    "react-i18next": { useTranslation: () => ({ t: (key, values = {}) => key + " " + Object.values(values).join(" ") }) },
    "@/components/ui/button/Button": { default: ({ children }) => createElement("button", {}, children) },
    "@/components/common/PageMeta": { default: () => null },
    "@/components/common/PageBreadCrumb": { default: () => null },
    "@/components/rewards/OrderPointRequestCard": { default: ({ request, children }) => createElement("article", {}, request.order_number, children) },
    "@/components/rewards/OrderPointsReviewForm": { default: () => createElement("form", {}, "REVIEW-FORM") },
    "@/hooks/useOrderPointRequests": { default: () => ({ feed: { status: "ready", requests }, refresh() {}, upsert() {} }) },
    "@/hooks/useRemoteData": { default: () => ({ data: customerError ? null : customers, error: customerError, refreshing: false, refresh() {} }) },
    "@/lib/api": { listAdminCustomers() {} },
    "@/lib/order-request-groups": { groupOrderRequests },
  };
  const evaluate = (code) => { const exports = {}; runInNewContext(code, { exports, require: (name) => { assert.ok(name in modules, name); return modules[name]; } }); return exports; };
  modules["@/components/rewards/OrderReviewCustomerList"] = evaluate(listCode);
  return renderToStaticMarkup(createElement(evaluate(pageCode).default));
}
test("review starts with customers and displays only the selected customer's matching applications", () => {
  const initial = render();
  assert.ok(initial.includes("Alice") && initial.includes("Bob") && initial.includes("No requests"));
  assert.ok(!initial.includes("REVIEW-FORM") && !initial.includes("ALICE-PENDING"));
  const alice = render("a");
  assert.ok(alice.includes("ALICE-PENDING") && alice.includes("REVIEW-FORM"));
  assert.ok(!alice.includes("BOB-PENDING") && !alice.includes("ALICE-APPROVED"));
  const all = render("a", "all");
  assert.ok(all.includes("ALICE-PENDING") && all.includes("ALICE-APPROVED"));
  assert.ok(!all.includes("BOB-PENDING"));
  assert.ok(render("empty").includes("adminOrderPoints.empty"));
});
test("customer loading errors cannot masquerade as a complete customer list", () => {
  const html = render(null, "pending", "testAuth.errors.failed");
  assert.ok(html.includes("adminOrderPoints.loadFailed"));
  assert.ok(!html.includes("adminOrderPoints.customerSummary"));
});

test("customer search matches names and emails without hiding applicants from the source data", () => {
  const byName = render(null, "pending", "", " ALICE ");
  assert.ok(byName.includes("Alice")); assert.ok(!byName.includes("Bob"));
  const byEmail = render(null, "pending", "", "SHARED@EXAMPLE.TEST");
  assert.ok(byEmail.includes("Alice") && byEmail.includes("Bob"));
  assert.ok(!byEmail.includes("No requests"));
  assert.ok(render(null, "pending", "", "nonexistent").includes("adminOrderPoints.noCustomers"));
});
