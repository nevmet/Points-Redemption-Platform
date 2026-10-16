import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { resolve } from "node:path";
import { createTestBackend } from "../server/test-backend.ts";

test("local avatar saves persist and cannot be assigned from another customer's folder", async () => {
  const root = resolve(".local-test/tests"); mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(resolve(root, "avatar-")), file = resolve(dir, "data.json"), images = resolve(dir, "images");
  let server, base;
  const start = async () => { server = createServer(createTestBackend(file, images)); await new Promise(done => server.listen(0, "127.0.0.1", done)); base = `http://127.0.0.1:${server.address().port}/api/local-test`; };
  const call = async (path, method = "GET", body, cookie = "") => {
    const binary = body instanceof Uint8Array;
    const response = await fetch(base + path, { method, headers: { Cookie: cookie, "Content-Type": binary ? "image/png" : "application/json" }, body: body === undefined ? undefined : binary ? body : JSON.stringify(body) });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  const login = async username => (await call("/signin", "POST", { username, password: "admin@123" })).cookie;
  await start();
  try {
    let customer = await login("user01"); const admin = await login("admin");
    const png = new Uint8Array([137,80,78,71,13,10,26,10]);
    assert.equal((await call("/avatar", "POST", png)).status, 401);
    assert.equal((await call("/avatar", "POST", new Uint8Array([1,2,3]), customer)).status, 400);
    const uploaded = await call("/avatar", "POST", png, customer);
    assert.equal(uploaded.status, 201);
    const profile = { name: "Customer", company: "Example", phone: "123", avatarUrl: uploaded.data.url };
    assert.equal((await call("/profile", "PATCH", profile, admin)).status, 400);
    assert.equal((await call("/profile", "PATCH", profile, customer)).status, 200);
    assert.equal((await call("/session", "GET", undefined, customer)).data.user.avatarUrl, profile.avatarUrl);
    assert.equal((await call("/profile", "GET", undefined, admin)).data.avatarUrl, undefined);
    await new Promise(done => server.close(done)); await start(); customer = await login("user01");
    assert.equal((await call("/session", "GET", undefined, customer)).data.user.avatarUrl, profile.avatarUrl);
    assert.equal((await call("/profile", "GET", undefined, customer)).data.avatarUrl, profile.avatarUrl);
    const { avatarUrl, ...withoutAvatar } = profile;
    await call("/profile", "PATCH", withoutAvatar, customer);
    assert.equal((await call("/profile", "GET", undefined, customer)).data.avatarUrl, avatarUrl);
  } finally {
    await new Promise(done => server.close(done));
    const accountDir = resolve(images, "avatars", "test-customer-01");
    for (const name of readdirSync(accountDir)) unlinkSync(resolve(accountDir, name));
    rmdirSync(accountDir); rmdirSync(resolve(images, "avatars")); rmdirSync(images); unlinkSync(file); rmdirSync(dir);
  }
});
