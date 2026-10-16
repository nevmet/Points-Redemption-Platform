import * as shippingAddress from "../src/lib/shipping-address.ts";
import * as uuid from "../src/lib/uuid.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as productImage from "../src/lib/product-image.ts";

const code = ts.transpileModule(readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function makeApi(error) {
  const exports = {};
  const client = { auth: {
    signInWithPassword: async ({ email, password }) => {
      assert.equal(email, "admin@example.test");
      assert.equal(password, "test-password");
      return { error };
    },
    getUser: async () => {
      assert.equal(error, null, "Failed authentication must not load a user");
      return { data: { user: { id: "admin-id", email: "admin@example.test", app_metadata: { role: "admin" } } }, error: null };
    },
  } };
  runInNewContext(code, { exports, require: name => {
    if (name === "./shipping-address") return shippingAddress;
    if (name === "./uuid") return uuid;
    if (name === "./product-image") return productImage;
    if (name === "./supabase") return { isSupabaseConfigured: true, requireSupabase: () => client };
    if (name === "./local-test-client") return {
      isLocalTestMode: false,
      ApiError: class extends Error { constructor(code) { super(code); this.code = code; } },
    };
    throw Error(name);
  } });
  return exports;
}

test("cloud login distinguishes password errors from service, rate limit, and account errors", async () => {
  for (const [error, expected] of [
    [{ code: "invalid_credentials", status: 400 }, "credentials"],
    [{ code: "email_not_confirmed", status: 400 }, "emailNotConfirmed"],
    [{ code: "user_banned", status: 403 }, "accountBlocked"],
    [{ code: "over_request_rate_limit", status: 429 }, "retryLater"],
    [{ status: 0, name: "AuthRetryableFetchError" }, "unavailable"],
    [{ status: 503, code: "unexpected_failure" }, "unavailable"],
    [{ status: 401, message: "Invalid API key" }, "unavailable"],
  ]) {
    const api = makeApi(error);
    await assert.rejects(api.signIn(" admin@example.test ", "test-password", false), failure => {
      assert.equal(failure.code, expected);
      assert.equal(api.apiErrorKey(failure), `testAuth.errors.${expected}`);
      return true;
    });
  }
});

test("successful cloud login uses the verified administrator role", async () => {
  const user = await makeApi(null).signIn("admin@example.test", "test-password", false);
  assert.equal(user.id, "admin-id");
  assert.equal(user.role, "admin");
});
