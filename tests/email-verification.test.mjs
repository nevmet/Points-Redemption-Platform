import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as shippingAddress from "../src/lib/shipping-address.ts";
import * as uuid from "../src/lib/uuid.ts";
import * as productImage from "../src/lib/product-image.ts";

const code = ts.transpileModule(readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function api(auth) {
  const exports = {};
  runInNewContext(code, { exports, require: name => {
    if (name === "./shipping-address") return shippingAddress;
    if (name === "./uuid") return uuid;
    if (name === "./product-image") return productImage;
    if (name === "./supabase") return { isSupabaseConfigured: true, requireSupabase: () => ({ auth }) };
    if (name === "./local-test-client") return { isLocalTestMode: false, ApiError: class extends Error { constructor(code) { super(code); this.code = code; } } };
    throw Error(name);
  } });
  return exports;
}
test("signup requests email verification, preserves password and passes only customer profile metadata", async () => {
  const service = api({ signUp: async input => {
    assert.equal(input.email, "customer@example.test");
    assert.equal(input.password, " MyTestPassword123 ");
    assert.deepEqual(JSON.parse(JSON.stringify(input.options)), { data: { name: "Customer" } });
    return { data: { session: null }, error: null };
  } });
  assert.equal(await service.signUpCustomer("Customer", " customer@example.test ", " MyTestPassword123 "), "verificationRequired");
});
test("verification validates format before sending and requires a confirmed session from Supabase", async () => {
  let calls = 0;
  const service = api({ verifyOtp: async input => {
    calls++; assert.equal(input.type, "email"); assert.equal(input.email, "customer@example.test"); assert.equal(input.token, "123456");
    return { data: { session: {}, user: { email_confirmed_at: "2026-10-14" } }, error: null };
  } });
  for (const bad of ["12345", "abcdef", "12345678901"]) await assert.rejects(service.verifySignupEmail("customer@example.test", bad), e => e.code === "otpFormat");
  assert.equal(calls, 0);
  await service.verifySignupEmail(" customer@example.test ", " 123456 "); assert.equal(calls, 1);
  for (const data of [{ session: null, user: null }, { session: {}, user: {} }]) {
    await assert.rejects(api({ verifyOtp: async () => ({ data, error: null }) }).verifySignupEmail("customer@example.test", "123456"), e => e.code === "otpInvalid");
  }
});
test("expired codes, mail delivery failures and rate limits remain actionable errors", async () => {
  for (const [error, expected] of [[{ code: "otp_expired", status: 403 }, "otpInvalid"], [{ code: "over_email_send_rate_limit", status: 429 }, "retryLater"], [{ code: "email_address_not_authorized", status: 422 }, "emailDelivery"]]) {
    const service = api({ verifyOtp: async () => ({ data: {}, error }), resend: async () => ({ error }) });
    await assert.rejects(service.verifySignupEmail("customer@example.test", "123456"), e => e.code === expected);
    await assert.rejects(service.resendSignupEmail("customer@example.test"), e => e.code === expected);
  }
});
test("resending uses signup confirmation, not passwordless login or new account creation", async () => {
  await api({ resend: async input => {
    assert.equal(input.type, "signup"); assert.equal(input.email, "customer@example.test"); return { error: null };
  } }).resendSignupEmail(" customer@example.test ");
});
test("unexpected auto-confirm configuration does not report a verified registration", async () => {
  let signedOut = false;
  const service = api({ signUp: async () => ({ data: { session: {} }, error: null }), signOut: async ({ scope }) => { assert.equal(scope, "local"); signedOut = true; return { error: null }; } });
  await assert.rejects(service.signUpCustomer("Customer", "customer@example.test", "TestPassword123"), e => e.code === "verificationDisabled");
  assert.equal(signedOut, true);
});
