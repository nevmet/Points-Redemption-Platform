import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as productImage from "../src/lib/product-image.ts";

// Exercise the real API module with a fake transport; never writes to Supabase.
const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup({ configured = true, role = "customer", signedIn = true, failure = null } = {}) {
  const calls = [];
  const user = { id: "customer-1", app_metadata: { role } };
  const client = {
    auth: { getUser: async () => ({ data: { user: signedIn ? user : null }, error: null }) },
    rpc: (name, args) => {
      calls.push({ name, args });
      return { single: async () => ({ data: { id: "request-1", order_number: "ORDER-001" }, error: failure }) };
    },
    from: (table) => ({ select: () => ({ order: () => {
      calls.push({ table });
      return { eq: async (column, value) => { calls.push({ column, value }); return { data: [], error: null }; }, data: [], error: null };
    } }) }),
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === "./product-image") return productImage;
      if (name === "./local-test-client") return { isLocalTestMode: false, ApiError: class extends Error {} };
      assert.equal(name, "./supabase");
      return { isSupabaseConfigured: configured, requireSupabase: () => client };
    },
  });
  return { api: exports, calls };
}

test("customer edits use the dedicated RPC and preserve backend error reasons", async () => {
  const { api, calls } = setup();
  await api.updateOrderPointRequest("r1", " UPDATED ");
  assert.equal(calls[0].name, "update_order_point_request");
  assert.equal(JSON.stringify(calls[0].args), '{"p_request_id":"r1","p_order_number":"UPDATED"}');
  await assert.rejects(api.updateOrderPointRequest("r1", " "), { code: "failed" });
  await assert.rejects(setup({ signedIn: false }).api.updateOrderPointRequest("r1", "UPDATED"), { code: "signin" });
  for (const [message, code] of [["order_points_forbidden", "forbidden"], ["order_points_already_reviewed", "reviewed"]]) {
    await assert.rejects(setup({ failure: { message } }).api.updateOrderPointRequest("r1", "UPDATED"), { code });
  }
});

test("staff reviews send the displayed order number to reject stale approvals", async () => {
  const { api, calls } = setup({ role: "admin" });
  await api.reviewOrderPointRequest("r1", true, 100, "", "UPDATED");
  assert.equal(calls[0].name, "review_current_order_point_request");
  assert.equal(calls[0].args.p_expected_order_number, "UPDATED");
  await assert.rejects(setup({ role: "admin", failure: { message: "order_points_changed" } }).api.reviewOrderPointRequest("r1", true, 100, "", "OLD"), { code: "changed" });
});

test("customers send only a trimmed order number, never identity or award amounts", async () => {
  const { api, calls } = setup();
  await api.submitOrderPointRequest("  ORDER-001  ");
  assert.equal(calls[0].name, "submit_order_point_request");
  assert.equal(JSON.stringify(calls[0].args), '{"p_order_number":"ORDER-001"}');
});

test("unconfigured and signed-out submissions never reach the RPC", async () => {
  for (const [options, code] of [[{ configured: false }, "unavailable"], [{ signedIn: false }, "signin"]]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.submitOrderPointRequest("ORDER-001"), { code });
    assert.equal(calls.length, 0);
  }
});

test("ordinary customers cannot access staff review or send awards", async () => {
  const { api, calls } = setup();
  await assert.rejects(api.listOrderPointRequests(true), { code: "forbidden" });
  await assert.rejects(api.reviewOrderPointRequest("r1", true, 100, ""), { code: "forbidden" });
  assert.equal(calls.length, 0);
});

test("customer history is constrained to the authenticated customer ID", async () => {
  const { api, calls } = setup();
  await api.listOrderPointRequests();
  assert.equal(calls[1].column, "customer_id");
  assert.equal(calls[1].value, "customer-1");
});

test("invalid staff point amounts never reach the RPC", async () => {
  const { api, calls } = setup({ role: "admin" });
  for (const points of [null, 0, -1, 1.5, NaN, Infinity, 2147483648]) {
    await assert.rejects(api.reviewOrderPointRequest("r1", true, points, ""), { code: "failed" });
  }
  assert.equal(calls.length, 0);
});

test("staff approval passes chosen points; rejection cannot award points", async () => {
  const { api, calls } = setup({ role: "admin" });
  await api.reviewOrderPointRequest("r1", true, 375, " verified ");
  await api.reviewOrderPointRequest("r2", false, 900, "Unable to verify");
  assert.equal(calls[0].name, "review_order_point_request");
  assert.equal(calls[0].args.p_points, 375);
  assert.equal(calls[0].args.p_note, "verified");
  assert.equal(calls[1].args.p_points, null);
  assert.equal(calls[1].args.p_approve, false);
});

test("duplicate and already-reviewed server responses never report success", async () => {
  for (const [failure, code] of [[{ code: "23505", message: "duplicate" }, "duplicate"], [{ message: "order_points_already_reviewed" }, "reviewed"]]) {
    const { api } = setup({ role: "admin", failure });
    await assert.rejects(api.reviewOrderPointRequest("r1", true, 100, ""), { code });
  }
});
