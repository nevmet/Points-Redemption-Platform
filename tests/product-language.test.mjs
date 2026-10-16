import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import ts from "typescript";
import * as display from "../src/lib/product-specification-display.ts";

const instance = createInstance();
await instance.init({ lng: "en", fallbackLng: "en", interpolation: { prefix: "{", suffix: "}" }, resources: Object.fromEntries(["zh", "en"].map((locale) => [locale, { translation: JSON.parse(readFileSync(new URL(`../src/locales/${locale}/common.json`, import.meta.url), "utf8")) }])) });
const t = (language) => instance.getFixedT(language);
const product = { id: "phone", name: "iPhone", points: 9999, variants: [{ id: "pro", name: "系列: Pro / 内存: 256GB", points: 9999, attributes: [{ name: "系列", value: "Pro" }, { name: "内存", value: "256GB" }] }], options: [{ id: "color", name: "颜色", values: ["勃艮第酒红色", "冰川蓝色", "银色", "黑色"] }] };

test("specifications, colors, custom bilingual terms and historical snapshots follow the display language", () => {
  assert.equal(display.variantText(product.variants[0], t("en"), "en"), "Series: Pro / Storage: 256GB");
  assert.equal(display.variantText(product.variants[0], t("zh"), "zh"), "系列: Pro / 内存: 256GB");
  assert.equal(display.specificationTerm("颜色", t("en"), "en"), "Color");
  assert.equal(display.specificationTerm("表面处理 | Finish", t("en"), "en-US"), "Finish");
  assert.equal(display.specificationTerm("表面处理 | Finish", t("zh"), "zh-CN"), "表面处理");
  assert.equal(display.specificationTerm("Pro Max", t("en"), "en"), "Pro Max");
  assert.equal(display.specificationText("系列: Pro Max / 内存: 1TB", t("en"), "en"), "Series: Pro Max / Storage: 1TB");
  const row = { type: "debit", description: "iPhone · 系列: Pro / 内存: 256GB" };
  assert.equal(display.pointDescription(row, t("en"), "en"), "iPhone · Series: Pro / Storage: 256GB");
  assert.equal(display.pointDescription({ ...row, operation_id: "manual" }, t("en"), "en"), row.description);
});

const code = ts.transpileModule(readFileSync(new URL("../src/components/rewards/ProductRedemptionDialog.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function render(language, selected = "", color, address = { address: {} }, addressError = "") {
  let index = 0, submit;
  const calls = [];
  const modules = {
    "react/jsx-runtime": jsx,
    "react-router": { Link: ({ children, to, ...props }) => createElement("a", { href: to, ...props }, children) },
    "@/hooks/useRemoteData": { default: () => ({ data: address, error: addressError, refresh() {} }) },
    react: { useState: (initial) => { const current = index++; return [current === 1 ? selected : current === 2 && color ? { color } : typeof initial === "function" ? initial() : initial, () => {}]; } },
    "react-i18next": { useTranslation: () => ({ t: t(language), i18n: { language } }) },
    "@/components/ui/modal": { Modal: ({ children }) => createElement("div", {}, children) },
    "@/hooks/useModal": { useModal: () => ({ isOpen: true }) },
    "@/lib/product-specification-display": display,
    "@/lib/product-display": { productText: (product, field) => product[field] },
    "@/lib/api": { redeemGift: async (...args) => calls.push(args) },
    "@/components/ui/button/Button": { default: ({ children, disabled, onClick }) => { if (children === t(language)("rewards.submitRequest")) submit = { disabled, onClick }; return createElement("button", { disabled }, children); } },
  };
  const exports = {};
  runInNewContext(code, { exports, require: (name) => { assert.ok(name in modules, name); return modules[name]; } });
  const html = renderToStaticMarkup(createElement(exports.default, { product, onClose() {}, onRedeemed() {} }));
  return { html, submit, calls };
}
test("English dialog has only real color options, defaults to the first color and requires a configuration", () => {
  const { html, submit } = render("en");
  assert.ok(!/[\u3400-\u9fff]/.test(html.replace(/<[^>]*>/g, "")));
  assert.equal((html.match(/<option /g) || []).length, 4);
  assert.ok(!html.includes('value=""'));
  assert.match(html, /<option value="勃艮第酒红色" selected="">Burgundy<\/option>/);
  for (const text of ["Glacier Blue", "Silver", "Black", "Series", "Storage", "Color"]) assert.ok(html.includes(text));
  assert.equal(submit.disabled, true);
  assert.ok(render("zh").html.includes("冰川蓝色"));
});
test("English selection submits original option values and unchanged variant ID and points", async () => {
  const { html, submit, calls } = render("en", "pro", "黑色");
  assert.match(html, /<option value="黑色" selected="">Black<\/option>/);
  assert.equal(submit.disabled, false);
  await submit.onClick();
  assert.equal(JSON.stringify(calls), JSON.stringify([["phone", "pro", 9999, [{ optionId: "color", value: "黑色" }], ""]]));
  assert.equal(product.options[0].name, "颜色");
});


test("checkout blocks missing, loading or failed addresses and offers the profile link", () => {
  const missing = render("en", "pro", "黑色", { address: null });
  assert.equal(missing.submit.disabled, true);
  assert.match(missing.html, /href="\/profile#shipping-address"/);
  assert.match(missing.html, /Please complete your shipping address/);
  assert.equal(render("en", "pro", "黑色", null).submit.disabled, true);
  assert.equal(render("en", "pro", "黑色", { address: {} }, "testAuth.errors.failed").submit.disabled, true);
});
