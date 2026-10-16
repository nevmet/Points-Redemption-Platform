import * as shippingAddress from "../src/lib/shipping-address.ts";
import * as uuid from "../src/lib/uuid.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import * as productImage from "../src/lib/product-image.ts";
const code=ts.transpileModule(readFileSync(new URL("../src/lib/api.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
test("a lost redemption response reuses the operation after page reload; a confirmed purchase starts a new operation",async()=>{
  const storage=new Map();const calls=[];let fail=true;let currentId="customer-a";
  const transport=async(path,method,body)=>{if(path==="/session")return {user:{id:currentId}};assert.equal(path,"/redemptions");calls.push(body);if(fail)throw Error("lost response");return {id:"confirmed"};};
  const create=()=>{const exports={};runInNewContext(code,{exports,crypto:{randomUUID},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},require:name=>{if(name==="./shipping-address")return shippingAddress;if(name==="./uuid")return uuid;if(name==="./product-image")return productImage;if(name==="./local-test-client")return {isLocalTestMode:true,localTestRequest:transport,ApiError:class extends Error{}};if(name==="./supabase")return {};throw Error(name);}});return exports;};
  let api=create();await assert.rejects(api.redeemGift("phone","pro",100,[{optionId:"color",value:"blue"}]),/lost response/);
  const first=calls[0].operationId;api=create();fail=false;await api.redeemGift("phone","pro",100,[{optionId:"color",value:"blue"}]);assert.equal(calls[1].operationId,first);assert.equal(storage.size,0);
  await api.redeemGift("phone","pro",100,[{optionId:"color",value:"blue"}]);assert.notEqual(calls[2].operationId,first);
  fail=true;await assert.rejects(api.redeemGift("phone","pro",100,[]));const pending=calls[3].operationId;currentId="customer-b";await assert.rejects(api.redeemGift("phone","pro",100,[]));assert.notEqual(calls[4].operationId,pending);
});

test("Supabase redemption retries keep their token and status changes use only the atomic RPC", async () => {
  const storage = new Map(), calls = [];
  let failure = "insufficient";
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "cloud-user", email: "cloud@example.test", user_metadata: {}, app_metadata: {} } }, error: null }) },
    rpc: (name, args) => { calls.push({ name, args }); return { single: async () => ({ data: failure ? null : { id: "cloud-request" }, error: failure ? { message: failure } : null }) }; },
    from: () => { throw Error("Direct gift table writes are forbidden"); },
  };
  const create = () => {
    const exports = {};
    runInNewContext(code, { exports, crypto: { randomUUID }, sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key,value) => storage.set(key,value), removeItem: key => storage.delete(key) }, require: name => {
      if (name === "./shipping-address") return shippingAddress;
    if (name === "./uuid") return uuid;
    if (name === "./product-image") return productImage;
      if (name === "./local-test-client") return { isLocalTestMode: false, ApiError: class extends Error { constructor(code) { super(code); this.code = code; } } };
      if (name === "./supabase") return { isSupabaseConfigured: true, requireSupabase: () => client };
      throw Error(name);
    } });
    return exports;
  };
  let api = create();
  await assert.rejects(api.redeemGift("phone", "pro", 100, [{ optionId: "color", value: "Blue" }]), { code: "insufficient" });
  const token = calls[0].args.p_operation_id;
  assert.equal(calls[0].name, "redeem_gift");
  api = create(); failure = null;
  await api.redeemGift("phone", "pro", 100, [{ optionId: "color", value: "Blue" }]);
  assert.equal(calls[1].args.p_operation_id, token);
  assert.equal(storage.size, 0);
  await api.setRedemptionRequestStatus("cloud-request", "cancelled", "  changed my mind  ");
  assert.equal(calls[2].name, "set_gift_request_status");
  assert.equal(calls[2].args.p_note, "changed my mind");
  failure = "redemptionState";
  await assert.rejects(api.setRedemptionRequestStatus("cloud-request", "completed"), { code: "redemptionState" });
});
