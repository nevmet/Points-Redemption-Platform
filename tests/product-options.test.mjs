import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { createTestBackend } from "../server/test-backend.ts";
import { validateProductOptions, resolveProductOptions } from "../src/lib/product-options.ts";

test("independent attributes require unique complete values and exact selections", () => {
  const color = { id: "color", name: " Color ", values: [" Black ", "White"] };
  const options = validateProductOptions([color]);
  assert.deepEqual(options, [{ id: "color", name: "Color", values: ["Black", "White"] }]);
  for (const invalid of [null, [{ ...color, values: [] }], [{ ...color, values: [" "] }], [{ ...color, values: ["Black", "black"] }], [color, { ...color, id: "other" }], Array(6).fill(color)]) {
    assert.throws(() => validateProductOptions(invalid), /optionInvalid/);
  }
  for (const invalid of [undefined, [], [{ optionId: "color", value: "Red" }], [{ optionId: "unknown", value: "Black" }], [{ optionId: "color", value: "Black" }, { optionId: "color", value: "White" }]]) {
    assert.throws(() => resolveProductOptions(options, invalid), /optionUnavailable/);
  }
  assert.deepEqual(resolveProductOptions(options, [{ optionId: "color", value: "Black", name: "forged" }]), [{ name: "Color", value: "Black" }]);
  assert.deepEqual(resolveProductOptions([], undefined), []);
  assert.throws(() => resolveProductOptions([], [{ optionId: "color", value: "Black" }]), /optionUnavailable/);
});

test("editing preserves variants/status, colors work with every variant and historical choices survive edits", async () => {
  const root = resolve(".local-test/tests"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "options-")); const file = resolve(dir, "data.json");
  const server = createServer(createTestBackend(file));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}/api/local-test`;
  const request = async (path, method = "GET", body, cookie = "") => {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  try {
    const admin = (await request("/signin", "POST", { username: "admin", password: "admin@123" })).cookie;
    const customer = (await request("/signin", "POST", { username: "user01", password: "admin@123" })).cookie;
    const shipping = { recipient: "Fixture", phone: "+1 202 555 0100", country: "US", city: "Boston", region: "MA", postalCode: "02108", line1: "1 Example St", line2: "" };
    assert.equal((await request("/shipping-address", "PATCH", shipping, customer)).status, 200);
    const variants = [{ id: "256", name: "Pro / 256GB", points: 100 }, { id: "512", name: "Pro / 512GB", points: 200 }];
    const options = [{ id: "color", name: "颜色", values: ["黑色", "白色"] }];
    const created = await request("/products", "POST", { name: "Options test", category: "Apple", points: 1, variants, options, status: "published" }, admin);
    assert.equal(created.status, 200);
    const path = "/products/" + created.data.id;
    assert.equal((await request(path, "PATCH", { options }, customer)).status, 403);
    assert.equal((await request(path, "PATCH", { options: [{ ...options[0], values: [] }] }, admin)).status, 400);
    const edited = await request(path, "PATCH", { name: "Edited product", description: "Updated details" }, admin);
    assert.equal(edited.data.status, "published"); assert.deepEqual(edited.data.variants, variants); assert.deepEqual(edited.data.options, options);
    const order = (await request("/orders", "POST", { orderNumber: "OPTIONS-TEST" }, customer)).data;
    await request("/orders/" + order.id, "PATCH", { approve: true, points: 2000 }, admin);
    const redeem = (variantId, value) => request("/redemptions", "POST", { productId: created.data.id, variantId, expectedPoints: variantId === "256" ? 100 : 200, selectedOptions: value === undefined ? undefined : [{ optionId: "color", value }], points: 1 }, customer);
    assert.equal((await redeem("256")).data.error, "optionUnavailable");
    assert.equal((await redeem("256", "红色")).data.error, "optionUnavailable");
    assert.equal((await request("/transactions", "GET", undefined, customer)).data.length, 1);
    let first;
    for (const variant of variants) for (const value of options[0].values) {
      const gift = await redeem(variant.id, value);
      assert.equal(gift.status, 201); assert.equal(gift.data.points, variant.points);
      assert.deepEqual(gift.data.selected_options, [{ name: "颜色", value }]);
      first ||= gift.data;
    }
    await request(path, "PATCH", { options: [{ id: "color", name: "外观", values: ["蓝色"] }] }, admin);
    assert.equal((await redeem("256", "黑色")).data.error, "optionUnavailable");
    const history = (await request("/redemptions?review=1", "GET", undefined, admin)).data.find((item) => item.id === first.id);
    assert.deepEqual(history.selected_options, [{ name: "颜色", value: "黑色" }]);
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(saved.products.find((item) => item.id === created.data.id).variants.length, 2);
    assert.deepEqual(saved.redemptions.find((item) => item.id === first.id).selected_options, history.selected_options);
    await request(path, "PATCH", { options: [], variants: [] }, admin);
    assert.equal((await redeem("256", "蓝色")).status, 409);
    const single = await request("/redemptions", "POST", { productId: created.data.id, expectedPoints: 100 }, customer);
    assert.equal(single.status, 201); assert.deepEqual(single.data.selected_options, []);
  } finally { await new Promise((done) => server.close(done)); unlinkSync(file); rmdirSync(dir); }
});
