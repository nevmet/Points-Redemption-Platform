import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createTestBackend } from "../server/test-backend.ts";

test("private messages, shipping checks and reviewed refunds remain isolated and persistent", async (t) => {
  const root = resolve(".local-test/tests"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "service-")), file = resolve(dir, "data.json");
  let server, base;
  const start = async () => { server = createServer(createTestBackend(file)); await new Promise(done => server.listen(0, "127.0.0.1", done)); base = `http://127.0.0.1:${server.address().port}/api/local-test`; };
  const call = async (path, method = "GET", body, cookie = "") => {
    const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, data: await res.json(), cookie: res.headers.get("set-cookie")?.split(";")[0] };
  };
  const login = async username => (await call("/signin", "POST", { username, password: "admin@123" })).cookie;
  await start();
  try {
    let customer = await login("user01"), admin = await login("admin");
    const signup = await call("/signup", "POST", { email: "other@example.test", password: "admin@123", name: "Other Customer" });
    assert.ok([200, 201].includes(signup.status), JSON.stringify(signup.data));
    let other = await login("other@example.test");
    const address = { recipient: "Test Customer", phone: "+7 999 000 0000", country: "Russia", region: "", city: "Moscow", postalCode: "", line1: "1 Example St", line2: "" };
    await call("/customers/test-customer-01/points", "POST", { type: "credit", points: 1000, note: "Test", operationId: randomUUID() }, admin);
    const product = (await call("/products", "POST", { name: "Service test", category: "Apple", points: 100, status: "published", image_urls: [] }, admin)).data;
    const payload = { productId: product.id, expectedPoints: 100, selectedOptions: [], operationId: randomUUID(), customerNote: "Please pack carefully\nСпасибо" };
    let gift, message;
    const ledger = async () => (await call("/transactions", "GET", undefined, customer)).data;
    const balance = async () => (await ledger()).reduce((sum, row) => sum + (row.type === "credit" ? row.points : -row.points), 0);

    await t.test("missing or invalid address blocks debit; server snapshots the saved address and note", async () => {
      assert.equal((await call("/redemptions", "POST", { ...payload, shipping_address: address }, customer)).data.error, "shippingRequired");
      assert.equal(await balance(), 1000);
      assert.equal((await call("/redemptions", "GET", undefined, customer)).data.length, 0);
      assert.equal((await call("/shipping-address", "PATCH", { ...address, phone: "" }, customer)).status, 400);
      assert.equal((await call("/shipping-address", "PATCH", address, customer)).status, 200);
      assert.equal((await call("/redemptions", "POST", { ...payload, customerNote: "x".repeat(2001) }, customer)).status, 400);
      const result = await call("/redemptions", "POST", payload, customer); assert.equal(result.status, 201); gift = result.data;
      assert.equal(gift.customer_note, payload.customerNote); assert.deepEqual(gift.shipping_address, address);
      assert.equal(await balance(), 900);
      assert.equal((await call("/redemptions", "POST", payload, customer)).data.id, gift.id);
      assert.equal((await call("/redemptions", "POST", { ...payload, customerNote: "Changed" }, customer)).data.error, "adjustmentConflict");
      await call("/shipping-address", "PATCH", { ...address, city: "Changed city" }, customer);
      assert.deepEqual((await call("/redemptions", "GET", undefined, customer)).data[0].shipping_address, address);
    });

    await t.test("only administrators can reply to a gift; other customers cannot see it", async () => {
      const path = `/redemptions/${gift.id}/reply`;
      assert.equal((await call(path, "PATCH", { reply: "forged" }, customer)).status, 403);
      assert.equal((await call(path, "PATCH", { reply: "forged" }, other)).status, 403);
      assert.equal((await call(path, "PATCH", { reply: " " }, admin)).status, 400);
      assert.equal((await call(path, "PATCH", { reply: "We will pack carefully." }, admin)).status, 200);
      assert.equal((await call("/redemptions", "GET", undefined, customer)).data[0].admin_reply, "We will pack carefully.");
      assert.equal((await call("/redemptions", "GET", undefined, other)).data.length, 0);
    });

    await t.test("cancellation requires review, can be declined and refunds once after approval", async () => {
      const path = `/redemptions/${gift.id}`;
      assert.equal((await call(path, "PATCH", { status: "cancel_requested", note: "forged" }, other)).status, 403);
      const requested = await call(path, "PATCH", { status: "cancelled", note: "Changed my mind" }, customer);
      assert.equal(requested.data.status, "cancel_requested"); assert.equal(requested.data.refunded_at, undefined);
      assert.equal(await balance(), 900);
      assert.equal((await call(path, "PATCH", { status: "completed" }, admin)).status, 409);
      assert.equal((await call(path, "PATCH", { status: "pending", note: " " }, admin)).status, 400);
      assert.equal((await call(path, "PATCH", { status: "pending", note: "Please confirm first" }, admin)).data.status, "pending");
      assert.equal(await balance(), 900);
      await call(path, "PATCH", { status: "cancel_requested", note: "Confirmed" }, customer);
      assert.equal((await call(path, "PATCH", { status: "cancelled", note: "I approve myself" }, customer)).data.status, "cancel_requested");
      assert.equal(await balance(), 900);
      const approved = await Promise.all([1, 2].map(() => call(path, "PATCH", { status: "cancelled", note: "Verified" }, admin)));
      assert.ok(approved.every(result => result.status === 200 && result.data.refunded_at));
      assert.equal(await balance(), 1000);
      assert.equal((await ledger()).filter(row => row.refund_redemption_id === gift.id).length, 1);
      assert.equal((await call(path, "PATCH", { status: "pending" }, admin)).status, 409);
    });

    await t.test("contact messages enforce ownership, admin replies and idempotent creation", async () => {
      assert.equal((await call("/contact-messages")).status, 401);
      const input = { body: "<script>alert(1)</script>\nPrivate question", operationId: randomUUID(), customer_id: "test-admin", reply: "forged" };
      assert.equal((await call("/contact-messages", "POST", { ...input, body: " " }, customer)).status, 400);
      assert.equal((await call("/contact-messages", "POST", { ...input, body: "x".repeat(2001) }, customer)).status, 400);
      const result = await call("/contact-messages", "POST", input, customer); assert.equal(result.status, 201); message = result.data;
      assert.equal(message.customer_id, "test-customer-01"); assert.equal(message.reply, "");
      assert.equal((await call("/contact-messages", "POST", input, customer)).data.id, message.id);
      assert.equal((await call("/contact-messages", "POST", input, other)).status, 409);
      assert.equal((await call("/contact-messages", "GET", undefined, other)).data.length, 0);
      assert.equal((await call("/contact-messages?review=1", "GET", undefined, customer)).status, 403);
      assert.equal((await call("/contact-messages?review=1", "GET", undefined, admin)).data.length, 1);
      assert.equal((await call(`/contact-messages/${message.id}`, "PATCH", { reply: "forged" }, customer)).status, 403);
      assert.equal((await call(`/contact-messages/${message.id}`, "DELETE", undefined, customer)).status, 403);
      assert.equal((await call(`/contact-messages/${message.id}`, "PATCH", { reply: "Reply\nSecond line" }, admin)).status, 200);
    });

    await new Promise(done => server.close(done)); await start();
    customer = await login("user01"); admin = await login("admin"); other = await login("other@example.test");
    await t.test("messages and replies survive restart and admin deletion removes both", async () => {
      const saved = (await call("/contact-messages", "GET", undefined, customer)).data[0];
      assert.equal(saved.id, message.id); assert.equal(saved.reply, "Reply\nSecond line");
      assert.equal((await call("/contact-messages", "GET", undefined, other)).data.length, 0);
      assert.equal((await call(`/contact-messages/${message.id}`, "PATCH", { reply: "Edited reply" }, admin)).status, 200);
      assert.equal((await call("/contact-messages", "GET", undefined, customer)).data[0].reply, "Edited reply");
      assert.equal((await call(`/contact-messages/${message.id}`, "DELETE", undefined, admin)).status, 200);
      assert.equal((await call("/contact-messages", "GET", undefined, customer)).data.length, 0);
      assert.equal(JSON.parse(readFileSync(file, "utf8")).contactMessages.length, 0);
    });
  } finally {
    await new Promise(done => server.close(done));
    if (existsSync(file)) unlinkSync(file); rmdirSync(dir);
  }
});
