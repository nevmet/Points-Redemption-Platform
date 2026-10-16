import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createTestBackend } from "../server/test-backend.ts";

test("local accounts enforce roles and persist the complete rewards workflow", async (t) => {
  const root = resolve(".local-test/tests");
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "run-"));
  const file = resolve(dir, "data.json");
  const server = createServer(createTestBackend(file));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}/api/local-test`;
  const request = async (path, method = "GET", body, cookie = "", headers = {}) => {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  try {
    assert.equal((await request("/products")).status, 401);
    assert.equal((await request("/signin", "POST", { username: "admin", password: "incorrect" })).status, 401);
    const customer = await request("/signin", "POST", { username: "user01", password: "admin@123" });
    const admin = await request("/signin", "POST", { username: "admin", password: "admin@123" });
    assert.equal(customer.data.user.role, "customer"); assert.equal(admin.data.user.role, "admin");
    const c = customer.cookie, a = admin.cookie;
    const shipping = { recipient: "Fixture", phone: "+1 202 555 0100", country: "US", city: "Boston", region: "MA", postalCode: "02108", line1: "1 Example St", line2: "" };
    assert.equal((await request("/shipping-address", "PATCH", shipping, c)).status, 200);
    await t.test("customer cannot view all requests or mutate products", async () => {
      assert.equal((await request("/orders?review=1", "GET", undefined, c)).status, 403);
      assert.equal((await request("/redemptions?review=1", "GET", undefined, c)).status, 403);
      assert.equal((await request("/products/1", "PATCH", { points: 1, role: "admin" }, c)).status, 403);
      assert.equal((await request("/products", "POST", { name: "forged" }, c)).status, 403);
      assert.equal((await request("/orders", "POST", { orderNumber: "X" }, c, { Origin: "https://example.com" })).status, 403);
    });
    const order = await request("/orders", "POST", { orderNumber: "ORDER-TEST-01", points: 99999, customer_id: "test-admin", status: "approved" }, c);
    assert.equal(order.status, 201); assert.equal(order.data.status, "pending"); assert.equal(order.data.customer_id, "test-customer-01"); assert.equal(order.data.awarded_points, null);
    const other = await request("/orders", "POST", { orderNumber: "OTHER-CUSTOMER-ORDER" }, a);
    await t.test("customers see only their own records; admins see all accounts", async () => {
      assert.equal((await request("/orders", "GET", undefined, c)).data.length, 1);
      assert.equal((await request("/orders?review=1", "GET", undefined, a)).data.length, 2);
      assert.equal((await request(`/orders/${order.data.id}`, "PATCH", { approve: true, points: 1000 }, c)).status, 403);
    });
    await t.test("owners can edit pending order numbers without changing awards or identity", async () => {
      const path = `/orders/${order.data.id}/details`;
      assert.equal((await request(path, "PATCH", { orderNumber: "UPDATED" })).status, 401);
      assert.equal((await request(path, "PATCH", { orderNumber: "UPDATED" }, a)).status, 403);
      assert.equal((await request(path, "PATCH", { orderNumber: " " }, c)).status, 400);
      const updated = await request(path, "PATCH", { orderNumber: " UPDATED ", status: "approved", awarded_points: 99999, customer_id: "test-admin" }, c);
      assert.equal(updated.status, 200);
      assert.equal(updated.data.order_number, "UPDATED");
      assert.equal(updated.data.status, "pending");
      assert.equal(updated.data.awarded_points, null);
      assert.equal(updated.data.customer_id, "test-customer-01");
      assert.equal((await request("/transactions", "GET", undefined, c)).data.length, 0);
      assert.equal((await request(`/orders/${order.data.id}`, "PATCH", { approve: true, points: 2000, expectedOrderNumber: order.data.order_number }, a)).data.error, "changed");
      assert.equal((await request("/orders?review=1", "GET", undefined, a)).data.find((row) => row.id === order.data.id).order_number, "UPDATED");
      await request(`/orders/${other.data.id}/details`, "PATCH", { orderNumber: "CHANGED" }, a);
      // Unchanged numbers are valid saves; editing does not create another application.
      assert.equal((await request(path, "PATCH", { orderNumber: "UPDATED" }, c)).status, 200);
      assert.equal((await request("/orders", "POST", { orderNumber: "updated" }, c)).status, 409);
    });
    await t.test("approval is validated and credits once; rejection adds no points", async () => {
      assert.equal((await request(`/orders/${order.data.id}`, "PATCH", { approve: true, points: -1 }, a)).status, 400);
      const outcomes = await Promise.all([1, 2].map(() => request(`/orders/${order.data.id}`, "PATCH", { approve: true, points: 2000 }, a)));
      assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 409]);
      assert.equal((await request("/transactions", "GET", undefined, c)).data.length, 1);
      assert.equal((await request(`/orders/${other.data.id}`, "PATCH", { approve: false, points: 999 }, a)).status, 200);
      assert.equal((await request("/transactions", "GET", undefined, a)).data.length, 0);
      assert.equal((await request(`/orders/${order.data.id}/details`, "PATCH", { orderNumber: "TOO-LATE" }, c)).status, 409);
      assert.equal((await request(`/orders/${other.data.id}/details`, "PATCH", { orderNumber: "TOO-LATE" }, a)).status, 409);
      assert.equal((await request("/transactions", "GET", undefined, c)).data[0].description, "UPDATED");
    });
    await t.test("admin edits and unpublishes products for every customer", async () => {
      const changed = await request("/products/1", "PATCH", { name: "Edited backpack", description: "Saved description", points: 1500, status: "draft" }, a);
      assert.equal(changed.status, 200);
      assert.equal((await request("/products", "GET", undefined, c)).data.some((p) => p.id === "1"), false);
      assert.equal((await request("/redemptions", "POST", { productId: "1" }, c)).status, 404);
      assert.equal((await request("/products/1", "PATCH", { status: "published" }, a)).status, 200);
      assert.equal((await request("/products", "GET", undefined, c)).data.find((p) => p.id === "1").name, "Edited backpack");
    });
    await t.test("gift requests debit the server price and are visible to the admin", async () => {
      const gift = await request("/redemptions", "POST", { productId: "1", points: 1, customer_email: "forged@example.test" }, c);
      assert.equal(gift.status, 201); assert.equal(gift.data.points, 1500); assert.equal(gift.data.customer_email, "user01@example.test");
      assert.equal((await request("/redemptions?review=1", "GET", undefined, a)).data.length, 1);
      assert.equal((await request("/redemptions", "GET", undefined, a)).data.length, 0);
      assert.equal((await request("/redemptions", "POST", { productId: "1" }, c)).status, 409);
      assert.equal((await request(`/redemptions/${gift.data.id}`, "PATCH", { status: "completed" }, c)).status, 403);
      assert.equal((await request(`/redemptions/${gift.data.id}`, "PATCH", { status: "completed" }, a)).status, 200);
      const saved = JSON.parse(readFileSync(file, "utf8"));
      assert.equal(saved.products[0].name, "Edited backpack");
      assert.equal(saved.redemptions[0].status, "completed");
      assert.equal(saved.transactions.reduce((n, r) => n + (r.type === "credit" ? r.points : -r.points), 0), 500);
    });
    await t.test("admins can delete redeemed draft products while retaining requests and point history", async () => {
      assert.equal((await request("/products/2", "DELETE")).status, 401);
      assert.equal((await request("/products/2", "DELETE", undefined, c)).status, 403);
      assert.equal((await request("/products/2", "DELETE", undefined, a)).status, 409);
      await request("/products/1", "PATCH", { status: "draft", name: "Renamed after redemption" }, a);
      const history = (await request("/redemptions", "GET", undefined, c)).data;
      const transactions = (await request("/transactions", "GET", undefined, c)).data;
      const referenced = await request("/products/1", "DELETE", undefined, a);
      assert.equal(referenced.status, 200);
      assert.equal((await request("/products", "GET", undefined, a)).data.some((product) => product.id === "1"), false);
      const preserved = (await request("/redemptions", "GET", undefined, c)).data;
      assert.deepEqual(preserved, history.map((row) => ({ ...row, product_id: null })));
      assert.equal(preserved[0].product_name, "Edited backpack");
      assert.equal(preserved[0].status, "completed");
      assert.deepEqual((await request("/transactions", "GET", undefined, c)).data, transactions);
      assert.equal((await request("/redemptions", "POST", { productId: "1" }, c)).status, 404);
      assert.equal(JSON.parse(readFileSync(file, "utf8")).redemptions[0].product_name, "Edited backpack");
      await request("/products/2", "PATCH", { status: "draft" }, a);
      assert.equal((await request("/products/2", "DELETE", undefined, a)).status, 200);
      assert.equal((await request("/products", "GET", undefined, a)).data.some((product) => product.id === "2"), false);
      assert.equal(JSON.parse(readFileSync(file, "utf8")).products.some((product) => product.id === "2"), false);
      assert.equal((await request("/products/2", "DELETE", undefined, a)).status, 404);
      assert.equal((await request("/redemptions?review=1", "GET", undefined, a)).data.length, 1);
    });
    await t.test("logout invalidates the server session", async () => {
      await request("/signout", "POST", {}, c);
      assert.equal((await request("/orders", "GET", undefined, c)).status, 401);
    });
  } finally {
    await new Promise((done) => server.close(done));
    try { unlinkSync(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    rmdirSync(dir);
  }
});
