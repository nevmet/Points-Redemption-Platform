import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { validateProductVariants } from "../src/lib/product-variants.ts";
import { createTestBackend } from "../server/test-backend.ts";

test("variant redemption charges the selected server price and preserves historical configuration", async () => {
  const root = resolve(".local-test/tests"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "variants-")); const file = resolve(dir, "data.json");
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
    const variants = [{ id: "pro-256", name: "Pro / 256GB", points: 600 }, { id: "max-512", name: "Pro Max / 512GB", points: 1400 }];
    const newProduct = await request("/products", "POST", { name: "New variant product", category: "Apple", points: 600, variants, image_url: null, image_urls: [], status: "draft" }, admin);
    assert.equal(newProduct.status, 200); assert.equal(newProduct.data.variants.length, 2);
    const attributes = [{ name: "系列", value: "Pro" }, { name: "内存", value: "256GB" }];
    const structured = await request("/products/" + newProduct.data.id, "PATCH", { status: "published", variants: [{ id: "custom", attributes, points: 300 }] }, admin);
    assert.equal(structured.status, 200);
    assert.deepEqual(structured.data.variants[0].attributes, attributes);
    assert.equal(structured.data.points, 300);
    const visible = (await request("/products", "GET", undefined, customer)).data.find((item) => item.id === newProduct.data.id);
    assert.equal(visible.variants[0].name, "系列: Pro / 内存: 256GB");
    assert.equal((await request("/products/1", "PATCH", { variants }, customer)).status, 403);
    for (const invalid of [[{ ...variants[0], points: 0 }], [{ ...variants[0], points: 1.5 }], [{ ...variants[0], name: " " }], [variants[0], { ...variants[1], name: " pro / 256gb " }], [variants[0], { ...variants[1], id: variants[0].id }], Array(31).fill(variants[0])]) {
      assert.equal((await request("/products/1", "PATCH", { variants: invalid }, admin)).status, 400);
    }
    const product = await request("/products/1", "PATCH", { variants, points: 1 }, admin);
    assert.equal(product.status, 200); assert.equal(product.data.points, 600);
    const order = (await request("/orders", "POST", { orderNumber: "VARIANTS-TEST" }, customer)).data;
    await request(`/orders/${order.id}`, "PATCH", { approve: true, points: 10000 }, admin);
    const redeem = (body) => request("/redemptions", "POST", { productId: "1", ...body }, customer);
    assert.equal((await redeem({})).data.error, "variantUnavailable");
    assert.equal((await redeem({ variantId: "other-product", expectedPoints: 600 })).data.error, "variantUnavailable");
    assert.equal((await redeem({ variantId: "max-512", expectedPoints: 1, points: 1 })).data.error, "priceChanged");
    assert.equal((await request("/transactions", "GET", undefined, customer)).data.length, 1);
    const gift = await redeem({ variantId: "max-512", expectedPoints: 1400, points: 1, variant_name: "forged", customer_email: "forged@example.test" });
    assert.equal(gift.status, 201); assert.equal(gift.data.points, 1400); assert.equal(gift.data.variant_name, "Pro Max / 512GB");
    assert.equal(gift.data.customer_email, "user01@example.test");
    const changed = [{ ...variants[0], points: 8000 }];
    await request("/products/1", "PATCH", { variants: changed, name: "Changed product" }, admin);
    assert.equal((await redeem({ variantId: "max-512", expectedPoints: 1400 })).data.error, "variantUnavailable");
    assert.equal((await redeem({ variantId: "pro-256", expectedPoints: 600 })).data.error, "priceChanged");
    const outcomes = await Promise.all([1, 2].map(() => redeem({ variantId: "pro-256", expectedPoints: 8000 })));
    assert.deepEqual(outcomes.map((outcome) => outcome.status).sort(), [201, 409]);
    const history = (await request("/redemptions?review=1", "GET", undefined, admin)).data.find((entry) => entry.id === gift.data.id);
    assert.equal(history.variant_name, "Pro Max / 512GB"); assert.equal(history.product_name, product.data.name); assert.equal(history.points, 1400);
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.deepEqual(saved.products[0].variants, changed);
    assert.equal(saved.transactions.reduce((sum, entry) => sum + (entry.type === "credit" ? entry.points : -entry.points), 0), 600);
  } finally { await new Promise((done) => server.close(done)); unlinkSync(file); rmdirSync(dir); }
});

test("custom specification fields normalize, preserve values and reject incomplete or duplicate combinations", () => {
  const attributes = [{ name: " 系列 ", value: "Pro" }, { name: "内存", value: "256GB" }];
  const row = { id: "structured", name: "forged", points: 500, attributes };
  const normalized = validateProductVariants([row])[0];
  assert.equal(normalized.name, "系列: Pro / 内存: 256GB");
  assert.deepEqual(normalized.attributes, [{ name: "系列", value: "Pro" }, { name: "内存", value: "256GB" }]);
  const invalid = [[], [{name:"",value:"Pro"}], [{name:"尺寸",value:""}], [{name:"Size",value:"S"},{name:"size",value:"M"}], Array(6).fill({name:"尺寸",value:"大"})];
  for (const attrs of invalid) assert.throws(() => validateProductVariants([{...row,attributes:attrs}]), /variantInvalid/);
  assert.throws(() => validateProductVariants([row,{...row,id:"duplicate"}]), /variantInvalid/);
  assert.throws(() => validateProductVariants([row,{id:"legacy",name:"legacy",points:100}]), /variantInvalid/);
  assert.throws(() => validateProductVariants([row,{...row,id:"different",attributes:[{name:"尺寸",value:"大"}]}]), /variantInvalid/);
  assert.equal(validateProductVariants([{...row,attributes:[{name:"尺寸",value:"大"},{name:"颜色",value:"白"}]}])[0].name,"尺寸: 大 / 颜色: 白");
});
