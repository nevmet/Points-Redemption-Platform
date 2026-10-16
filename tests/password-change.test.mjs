import * as shippingAddress from "../src/lib/shipping-address.ts";
import * as uuid from "../src/lib/uuid.ts";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as productImage from "../src/lib/product-image.ts";
import { createTestBackend } from "../server/test-backend.ts";

test("password changes persist for built-in and registered accounts, verify ownership and invalidate other local sessions", async () => {
  const root = resolve(".local-test/tests"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "passwords-")), file = resolve(dir, "data.json");
  let server, base;
  const start = async () => { server = createServer(createTestBackend(file)); await new Promise((done) => server.listen(0, "127.0.0.1", done)); base = `http://127.0.0.1:${server.address().port}/api/local-test`; };
  const close = () => new Promise((done) => server.close(done));
  const request = async (path, method = "GET", body, cookie = "") => {
    const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, data: await res.json(), cookie: res.headers.get("set-cookie")?.split(";")[0] };
  };
  const login = (username, password) => request("/signin", "POST", { username, password });
  try {
    await start();
    assert.equal((await request("/password", "PATCH", { currentPassword: "admin@123", newPassword: "NewTestPass123!" })).status, 401);
    const current = await login("user01", "admin@123"), other = await login("user01", "admin@123"), admin = await login("admin", "admin@123");
    const update = (currentPassword, newPassword) => request("/password", "PATCH", { currentPassword, newPassword, customerId: "test-admin", role: "admin" }, current.cookie);
    assert.equal((await update("wrong", "NewTestPass123!")).data.error, "currentPassword");
    assert.equal((await update("admin@123", "short")).data.error, "passwordLength");
    assert.equal((await update("admin@123", "admin@123")).data.error, "samePassword");
    assert.equal((await update("admin@123", "NewTestPass123!")).status, 200);
    assert.equal((await request("/session", "GET", undefined, current.cookie)).data.user.role, "customer");
    assert.equal((await request("/session", "GET", undefined, other.cookie)).data.user, null);
    assert.equal((await request("/session", "GET", undefined, admin.cookie)).data.user.role, "admin");
    assert.equal((await login("user01", "admin@123")).status, 401);
    assert.equal((await login("user01", "NewTestPass123!")).status, 200);
    assert.equal((await login("admin", "admin@123")).status, 200);
    assert.equal((await request("/signup", "POST", { name: "Password test", email: "password@example.test", password: "OriginalTest123!" })).status, 201);
    const registered = await login("password@example.test", "OriginalTest123!");
    assert.equal((await request("/password", "PATCH", { currentPassword: "OriginalTest123!", newPassword: "RegisteredNew123!" }, registered.cookie)).status, 200);
    const raw = readFileSync(file, "utf8");
    for (const password of ["admin@123", "NewTestPass123!", "OriginalTest123!", "RegisteredNew123!"]) assert.ok(!raw.includes(password));
    const before = JSON.parse(raw);
    assert.equal(before.transactions.length, 0);
    await close(); await start();
    assert.equal((await login("user01", "admin@123")).status, 401);
    assert.equal((await login("user01", "NewTestPass123!")).status, 200);
    assert.equal((await login("password@example.test", "OriginalTest123!")).status, 401);
    assert.equal((await login("password@example.test", "RegisteredNew123!")).status, 200);
    const limited = await login("admin", "admin@123");
    for (let i = 0; i < 5; i++) assert.equal((await request("/password", "PATCH", { currentPassword: "wrong", newPassword: "UnusedPassword123!" }, limited.cookie)).data.error, "currentPassword");
    assert.equal((await request("/password", "PATCH", { currentPassword: "admin@123", newPassword: "UnusedPassword123!" }, limited.cookie)).status, 429);
    assert.equal((await login("admin", "admin@123")).status, 200);
  } finally {
    if (server?.listening) await close();
    try { unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    rmdirSync(dir);
  }
});

const compiled = ts.transpileModule(readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup({ signedIn = true, verificationError = null, changedIdentity = false, updateError = null } = {}) {
  const calls = [];
  class ApiError extends Error { constructor(code) { super(code); this.code = code; } }
  const client = { auth: {
    getUser: async () => ({ data: { user: signedIn ? { id: "me", email: "me@example.test" } : null }, error: null }),
    signInWithPassword: async (input) => { calls.push(["verify", input]); return { data: { user: { id: changedIdentity ? "other" : "me" } }, error: verificationError }; },
    updateUser: async (input) => { calls.push(["update", input]); return { error: updateError }; },
  } };
  const exports = {};
  runInNewContext(compiled, { exports, require: (name) => {
    if (name === "./shipping-address") return shippingAddress;
    if (name === "./uuid") return uuid;
    if (name === "./product-image") return productImage;
    if (name === "./local-test-client") return { isLocalTestMode: false, ApiError };
    assert.equal(name, "./supabase"); return { isSupabaseConfigured: true, requireSupabase: () => client };
  } });
  return { api: exports, calls };
}
test("production password updates verify the current account before updating credentials", async () => {
  const { api, calls } = setup();
  await api.changePassword(" CurrentPassword123! ", " NewPassword123! ");
  assert.equal(calls[0][1].email, "me@example.test");
  assert.equal(calls[0][1].password, " CurrentPassword123! ");
  assert.equal(calls[1][1].password, " NewPassword123! ");
  assert.equal(calls[1][1].current_password, " CurrentPassword123! ");
  for (const [options, code] of [[{ signedIn: false }, "signin"], [{ verificationError: { code: "invalid_credentials" } }, "currentPassword"], [{ changedIdentity: true }, "signin"]]) {
    const { api, calls } = setup(options);
    await assert.rejects(api.changePassword("CurrentPassword123!", "NewPassword123!"), { code });
    assert.ok(!calls.some(([name]) => name === "update"));
  }
  const weak = setup({ updateError: { code: "weak_password" } });
  await assert.rejects(weak.api.changePassword("CurrentPassword123!", "NewPassword123!"), { code: "weakPassword" });
  await assert.rejects(api.changePassword("CurrentPassword123!", "short"), { code: "passwordLength" });
});
