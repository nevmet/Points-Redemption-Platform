import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createTestBackend } from "../server/test-backend.ts";

test("categories migrate once, enforce roles and keep product assignments consistent", async () => {
  const root = resolve(".local-test/tests");
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "categories-"));
  const file = resolve(dir, "data.json");
  writeFileSync(file, JSON.stringify({ version: 1, products: [{ id: "legacy", name: "Existing product", category: "Travel", points: 100, status: "published", image_url: null, description: "", featured: false, sort_order: 0, created_at: "2026-10-13", updated_at: "2026-10-13" }], orders: [], redemptions: [], transactions: [] }));
  const server = createServer(createTestBackend(file));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}/api/local-test`;
  const request = async (path, method = "GET", body, cookie = "") => {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  try {
    assert.equal((await request("/categories")).status, 401);
    const admin = (await request("/signin", "POST", { username: "admin", password: "admin@123" })).cookie;
    const customer = (await request("/signin", "POST", { username: "user01", password: "admin@123" })).cookie;
    const initial = (await request("/categories", "GET", undefined, customer)).data;
    assert.deepEqual(initial.map((entry) => entry.name), ["Apple", "Louis Vuitton"]);
    assert.equal((await request("/products", "GET", undefined, customer)).data[0].category, "Apple");
    const apple = initial[0].id;
    for (const [path, method] of [["/categories", "POST"], [`/categories/${apple}`, "PATCH"], [`/categories/${apple}`, "DELETE"]]) assert.equal((await request(path, method, method === "DELETE" ? undefined : { name: "Forbidden" }, customer)).status, 403);
    assert.equal((await request("/categories", "POST", { name: " apple " }, admin)).status, 409);
    assert.equal((await request("/categories", "POST", { name: "  " }, admin)).status, 400);
    assert.equal((await request("/products/legacy", "PATCH", { category: "Unknown" }, admin)).status, 400);
    assert.equal((await request(`/categories/${apple}`, "DELETE", undefined, admin)).status, 409);
    assert.equal((await request(`/categories/${apple}`, "PATCH", { name: "Apple Updated" }, admin)).status, 200);
    assert.equal((await request("/products", "GET", undefined, customer)).data[0].category, "Apple Updated");
    createTestBackend(file);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).products[0].category, "Apple Updated");
    const added = await request("/categories", "POST", { name: "Temporary category" }, admin);
    assert.equal(added.status, 201);
    assert.equal((await request(`/categories/${added.data.id}`, "DELETE", undefined, admin)).status, 200);
    assert.equal((await request("/products/legacy", "PATCH", { category: "Louis Vuitton" }, admin)).status, 200);
    assert.equal((await request(`/categories/${apple}`, "DELETE", undefined, admin)).status, 200);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).products[0].category, "Louis Vuitton");
  } finally {
    await new Promise((done) => server.close(done));
    unlinkSync(file); rmdirSync(dir);
  }
});
