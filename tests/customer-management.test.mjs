import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createTestBackend } from "../server/test-backend.ts";

test("registered customers appear for admins; audited adjustments enforce isolation, retries and available balance", async () => {
  const root = resolve(".local-test/tests"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "customers-")); const file = resolve(dir, "data.json");
  const server = createServer(createTestBackend(file));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}/api/local-test`;
  const request = async (path, method = "GET", body, cookie = "") => {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  try {
    assert.equal((await request("/customers")).status, 401);
    const signup = { name: "New Customer", email: "new@example.test", password: "Registration123!", role: "admin" };
    assert.equal((await request("/signup", "POST", { ...signup, password: "short" })).status, 400);
    const registered = await request("/signup", "POST", signup);
    assert.equal(registered.status, 201); assert.equal(JSON.stringify(registered.data).includes("digest"), false);
    assert.equal((await request("/signup", "POST", { ...signup, email: "NEW@example.test" })).status, 409);
    const customerLogin = await request("/signin", "POST", { username: signup.email, password: signup.password });
    assert.equal(customerLogin.data.user.role, "customer"); assert.equal(customerLogin.data.user.digest, undefined); assert.equal(customerLogin.data.user.salt, undefined);
    const customer = customerLogin.cookie; const id = customerLogin.data.user.id;
    const other = (await request("/signin", "POST", { username: "user01", password: "admin@123" })).cookie;
    const admin = (await request("/signin", "POST", { username: "admin", password: "admin@123" })).cookie;
    assert.equal((await request("/customers", "GET", undefined, customer)).status, 403);
    const list = (await request("/customers", "GET", undefined, admin)).data;
    assert.equal(list.length, 2); assert.equal(list.some((row) => row.username === "admin"), false);
    assert.equal(list.find((row) => row.id === id).balance, 0); assert.equal(list.find((row) => row.id === id).email, signup.email);
    const adjustment = { type: "credit", points: 100, note: "Manual award", operationId: randomUUID(), created_by: "forged" };
    const path = "/customers/" + id;
    assert.equal((await request(path + "/points", "POST", adjustment, customer)).status, 403);
    assert.equal((await request(path + "/transactions", "GET", undefined, other)).status, 403);
    for (const points of [0, -1, 1.5, 2147483648, "100"]) assert.equal((await request(path + "/points", "POST", { ...adjustment, points }, admin)).status, 400);
    assert.equal((await request("/customers/test-admin/points", "POST", adjustment, admin)).status, 404);
    const awarded = await request(path + "/points", "POST", adjustment, admin);
    assert.equal(awarded.status, 201); assert.equal(awarded.data.balance_after, 100); assert.equal(awarded.data.created_by, "test-admin"); assert.equal(awarded.data.operator_name, "admin");
    const retry = await request(path + "/points", "POST", adjustment, admin);
    assert.equal(retry.status, 200); assert.equal(retry.data.id, awarded.data.id);
    assert.equal((await request(path + "/points", "POST", { ...adjustment, points: 200 }, admin)).data.error, "adjustmentConflict");
    const deduct = { type: "debit", points: 80, note: "Manual deduction", operationId: randomUUID() };
    const concurrent = await Promise.all([deduct, { ...deduct, operationId: randomUUID() }].map((body) => request(path + "/points", "POST", body, admin)));
    assert.deepEqual(concurrent.map((row) => row.status).sort(), [201, 409]);
    const summary = (await request("/customers", "GET", undefined, admin)).data.find((row) => row.id === id);
    assert.equal(summary.balance, 20); assert.equal(summary.total_credit, 100); assert.equal(summary.total_debit, 80);
    assert.equal((await request(path + "/transactions", "GET", undefined, admin)).data.length, 2);
    assert.equal((await request("/transactions", "GET", undefined, customer)).data.length, 2);
    assert.equal((await request("/transactions", "GET", undefined, other)).data.length, 0);
    const stored = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(stored.customers[0].email, signup.email); assert.equal(stored.customers[0].password, undefined);
    assert.equal(readFileSync(file, "utf8").includes(signup.password), false);
    const restarted = createServer(createTestBackend(file));
    await new Promise((done) => restarted.listen(0, "127.0.0.1", done));
    try {
      const login = await fetch(`http://127.0.0.1:${restarted.address().port}/api/local-test/signin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: signup.email, password: signup.password }) });
      assert.equal(login.status, 200); assert.equal((await login.json()).user.id, id);
    } finally { await new Promise((done) => restarted.close(done)); }
  } finally { await new Promise((done) => server.close(done)); unlinkSync(file); rmdirSync(dir); }
});
