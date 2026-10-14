import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import test from "node:test";
import { createTestBackend } from "../server/test-backend.ts";
import { MAX_PRODUCT_IMAGE_BYTES, productImages } from "../src/lib/product-image.ts";

test("image upload enforces admin, type and size; galleries persist in order", async () => {
  const root = resolve(".local-test/tests");
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "images-"));
  const file = resolve(dir, "data.json");
  const uploads = resolve(dir, "uploads");
  const server = createServer(createTestBackend(file, uploads));
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}/api/local-test`;
  const login = async (username) => (await fetch(base + "/signin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password: "admin@123" }) })).headers.get("set-cookie").split(";")[0];
  const upload = (cookie, body, mime = "image/jpeg") => fetch(base + "/product-images", { method: "POST", headers: { Cookie: cookie, "Content-Type": mime, "X-Filename": "../../outside.jpg" }, body });
  try {
    const admin = await login("admin"), customer = await login("user01");
    const bytes = readFileSync("public/images/product/product-01.jpg");
    assert.equal((await upload("", bytes)).status, 401);
    assert.equal((await upload(customer, bytes)).status, 403);
    assert.equal((await upload(admin, Buffer.from("<svg onload='alert(1)'/>"))).status, 400);
    assert.equal((await upload(admin, bytes, "image/png")).status, 400);
    assert.equal((await upload(admin, Buffer.alloc(0))).status, 400);
    assert.equal((await upload(admin, Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1))).status, 413);
    const result = await upload(admin, bytes);
    assert.equal(result.status, 201);
    const { url } = await result.json();
    assert.match(url, /^\/images\/products\/uploads\/[a-f0-9-]+\.jpg$/);
    assert.deepEqual(readFileSync(resolve(uploads, basename(url))), bytes);
    const gallery = [url, "/images/product/product-02.jpg"];
    const edit = (image_urls) => fetch(base + "/products/1", { method: "PATCH", headers: { Cookie: admin, "Content-Type": "application/json" }, body: JSON.stringify({ image_urls, image_url: "https://ignored.example/cover.jpg" }) });
    assert.equal((await edit(Array(9).fill(url))).status, 400);
    assert.equal((await edit(["javascript:alert(1)"])).status, 400);
    assert.equal((await edit(gallery)).status, 200);
    const customerProducts = await (await fetch(base + "/products", { headers: { Cookie: customer } })).json();
    assert.deepEqual(customerProducts.find((p) => p.id === "1").image_urls, gallery);
    const saved = JSON.parse(readFileSync(file, "utf8")).products[0];
    assert.deepEqual(saved.image_urls, gallery);
    assert.equal(saved.image_url, gallery[0]);
    assert.deepEqual(productImages({ image_url: url }), [url]);
    assert.equal((await edit([])).status, 200);
    assert.equal(JSON.parse(readFileSync(file, "utf8")).products[0].image_url, null);
  } finally {
    await new Promise((done) => server.close(done));
    if (existsSync(uploads)) { for (const name of readdirSync(uploads)) unlinkSync(resolve(uploads, name)); rmdirSync(uploads); }
    if (existsSync(file)) unlinkSync(file);
    rmdirSync(dir);
  }
});
