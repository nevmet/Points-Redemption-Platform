import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as shippingAddress from "../src/lib/shipping-address.ts";

const address = { recipient: "Example Customer", phone: "+1 202 555 0100", country: "US", region: "DC", city: "Washington", postalCode: "20001", line1: "<script>unsafe</script>", line2: "Unit 2" };
function render(file, data, lang = "en", error = "") {
  const translations = JSON.parse(readFileSync(new URL(`../src/locales/${lang}/common.json`, import.meta.url), "utf8"));
  const code = ts.transpileModule(readFileSync(new URL(`../src/components/${file}.tsx`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const modules = {
    react: React, "react/jsx-runtime": jsxRuntime,
    "react-i18next": { useTranslation: () => ({ t: key => key.split(".").reduce((obj, part) => obj?.[part], translations) || key }) },
    "@/context/AuthContext": { useAuth: () => ({ user: { id: "test-customer" } }) },
    "@/hooks/useRemoteData": { default: () => ({ data, error, refresh: () => {}, refreshing: false }) },
    "@/lib/api": {}, "@/lib/shipping-address": shippingAddress,
    "@/components/ui/button/Button": { default: ({ children }) => React.createElement("button", null, children) },
    "@/components/form/input/InputField": { default: "input" },
    "@/components/form/Label": { default: "label" },
  };
  const exports = {};
  runInNewContext(code, { exports, require: name => { assert.ok(name in modules, name); return modules[name]; } });
  return renderToStaticMarkup(React.createElement(exports.default, { customerId: "test-customer" }));
}
test("customer and administrator views show complete addresses safely in both languages", () => {
  for (const component of ["UserProfile/UserAddressCard", "rewards/CustomerShippingAddress"]) {
    for (const lang of ["en", "zh"]) {
      const html = render(component, { address }, lang);
      for (const value of [address.recipient, address.phone, address.city, address.postalCode, address.line2]) assert.ok(html.includes(value));
      assert.ok(html.includes("&lt;script&gt;unsafe&lt;/script&gt;"));
      assert.ok(!html.includes("<script>unsafe"));
      assert.ok(!html.includes("shippingAddress."));
    }
  }
});
test("missing addresses and failed administrator reads are distinct", () => {
  assert.match(render("UserProfile/UserAddressCard", { address: null }), /No shipping address added yet/);
  assert.match(render("rewards/CustomerShippingAddress", { address: null }), /has not added a shipping address/);
  const failure = render("rewards/CustomerShippingAddress", null, "en", "testAuth.errors.failed");
  assert.match(failure, /role="alert"/);
  assert.ok(!failure.includes("has not added a shipping address"));
});
