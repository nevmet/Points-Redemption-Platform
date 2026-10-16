import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as shippingAddress from "../src/lib/shipping-address.ts";
import * as uuid from "../src/lib/uuid.ts";
import * as productImage from "../src/lib/product-image.ts";

const address = { recipient: " Example Customer ", phone: "+7 999 000 0000", country: "Россия", city: "Москва", region: "", postalCode: "", line1: "Примерная улица, 1", line2: "" };
const normalized = shippingAddress.normalizeShippingAddress(address);
const code = ts.transpileModule(readFileSync(new URL("../src/lib/api.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function makeApi(client) {
  const exports = {};
  const modules = {
    "./shipping-address": shippingAddress, "./uuid": uuid, "./product-image": productImage,
    "./supabase": { isSupabaseConfigured: true, requireSupabase: () => client },
    "./local-test-client": { isLocalTestMode: false, ApiError: class extends Error { constructor(code) { super(code); this.code = code; } } },
  };
  runInNewContext(code, { exports, require: name => { assert.ok(name in modules, name); return modules[name]; } });
  return exports;
}

test("profile avatar uses own private storage and only replaces old image after metadata save", async () => {
  const previous = "customer/11111111-1111-4111-8111-111111111111.png";
  let meta = { name: "Customer", avatar_path: previous, shipping_address: normalized };
  let failSave = false;
  const removed = [], uploaded = [];
  const api = makeApi({ auth: {
    getUser: async () => ({ data: { user: { id: "customer", email: "customer@example.test", user_metadata: meta, app_metadata: {} } } }),
    updateUser: async ({ data }) => {
      if (failSave) return { error: Error("save failed") };
      assert.equal(data.role, undefined); assert.equal(data.avatarUrl, undefined);
      meta = { ...meta, ...data }; return { error: null };
    },
  }, storage: { from: bucket => {
    assert.equal(bucket, "customer-avatars");
    return {
      upload: async (path, file, options) => { assert.match(path, /^customer\/[a-f0-9-]+\.png$/); assert.equal(options.upsert, false); uploaded.push(path); return { error: null }; },
      remove: async paths => { removed.push(...paths); return { error: null }; },
      createSignedUrl: async path => ({ data: { signedUrl: "https://example.test/signed/" + path }, error: null }),
    };
  } } });
  const image = new File([new Uint8Array([137,80,78,71,13,10,26,10])], "avatar.png", { type: "image/png" });
  const profile = { name: "New name", company: "Company", phone: "123", role: "admin", avatarUrl: "https://untrusted.test/image" };
  await api.saveMyProfile(profile, image);
  assert.deepEqual(removed, [previous]);
  assert.equal(meta.avatar_path, uploaded[0]); assert.deepEqual(meta.shipping_address, normalized);
  assert.equal((await api.getMyProfile()).avatarUrl, "https://example.test/signed/" + uploaded[0]);
  assert.equal((await api.getCurrentUser()).avatarUrl, "https://example.test/signed/" + uploaded[0]);
  failSave = true;
  await assert.rejects(api.saveMyProfile(profile, image), /save failed/);
  assert.equal(meta.avatar_path, uploaded[0]); assert.equal(removed[1], uploaded[1]);
  await assert.rejects(api.saveMyProfile(profile, new File(["<svg/>"], "fake.png", { type: "image/png" })), { code: "imageType" });
  await assert.rejects(api.saveMyProfile(profile, new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })), { code: "imageSize" });
  assert.equal(uploaded.length, 2);
});

test("cloud addresses save only whitelisted address fields, preserve profile metadata and propagate failures", async () => {
  let meta = { name: "Existing name", company: "Existing company" }, fail = false, writes = 0;
  const api = makeApi({ auth: {
    getUser: async () => ({ data: { user: { user_metadata: meta } }, error: null }),
    updateUser: async ({ data }) => {
      writes++;
      assert.deepEqual(Object.keys(data), ["shipping_address"]);
      if (fail) return { data: { user: null }, error: new Error("network unavailable") };
      meta = { ...meta, ...data };
      return { data: { user: { user_metadata: meta } }, error: null };
    },
  } });
  assert.equal(await api.getMyShippingAddress(), null);
  assert.deepEqual(await api.saveMyShippingAddress({ ...address, role: "admin", customer_id: "someone-else" }), normalized);
  assert.deepEqual(await api.getMyShippingAddress(), normalized);
  assert.equal(meta.name, "Existing name"); assert.equal(meta.company, "Existing company");
  assert.equal(meta.shipping_address.role, undefined);
  await assert.rejects(api.saveMyShippingAddress({ ...address, phone: "  " }), { code: "invalid" });
  await assert.rejects(api.saveMyShippingAddress({ ...address, line1: "x".repeat(201) }), { code: "invalid" });
  assert.equal(writes, 1);
  fail = true;
  await assert.rejects(api.saveMyShippingAddress(address), /network unavailable/);
});

test("failed avatar uploads never update metadata or delete existing pictures", async () => {
  const file = new File([new Uint8Array([137,80,78,71,13,10,26,10])], "photo.png", { type: "image/png" });
  for (const [failure, expected] of [[{ message: "Bucket not found" }, "avatarStorageUnavailable"], [{ message: "new row violates row-level security policy" }, "avatarUploadFailed"], [null, "avatarUploadFailed"]]) {
    const api = makeApi({ auth: {
      getUser: async () => ({ data: { user: { id: "customer", user_metadata: { avatar_path: "customer/old.png" } } } }),
      updateUser: async () => { assert.fail("Upload failure must not update profile metadata"); },
    }, storage: { from: bucket => {
      assert.equal(bucket, "customer-avatars");
      return { upload: async () => { if (!failure) throw Error("network offline"); return { error: failure }; }, remove: async () => { assert.fail("Upload failure must not delete any images"); } };
    } } });
    await assert.rejects(api.saveMyProfile({ name: "Customer", company: "", phone: "" }, file), error => {
      assert.equal(error.code, expected); assert.equal(api.apiErrorKey(error), "profileAvatar." + expected); return true;
    });
  }
});

test("only authenticated administrators call the customer address RPC", async () => {
  let role = "customer", signedIn = false, calls = 0, rpcError = null;
  const api = makeApi({
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: "viewer", email: "viewer@example.test", user_metadata: {}, app_metadata: { role } } : null }, error: null }) },
    rpc: async (name, args) => {
      calls++; assert.equal(name, "get_admin_customer_shipping_address"); assert.equal(args.p_customer_id, "target-customer");
      return { data: normalized, error: rpcError };
    },
  });
  await assert.rejects(api.getCustomerShippingAddress("target-customer"), { code: "signin" });
  signedIn = true;
  await assert.rejects(api.getCustomerShippingAddress("target-customer"), { code: "forbidden" });
  assert.equal(calls, 0);
  role = "admin";
  assert.deepEqual(await api.getCustomerShippingAddress("target-customer"), normalized);
  rpcError = { message: "forbidden" };
  await assert.rejects(api.getCustomerShippingAddress("target-customer"), { code: "forbidden" });
});
