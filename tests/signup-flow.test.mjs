import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Exercise the real component handlers with isolated state and service doubles.
function mount(file, mocks, props = {}) {
  const values = []; let cursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === "function" ? initial() : initial;
      return [values[index], value => { values[index] = typeof value === "function" ? value(values[index]) : value; }];
    },
    useRef(initial) { const [ref] = react.useState(() => ({ current: initial })); return ref; },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(`../src/components/auth/${file}.tsx`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, { exports, Date, FormData: class { constructor(form) { this.form = form; } get(name) { return this.form[name]; } }, require(name) {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "fragment" };
    if (name === "react-i18next") return { useTranslation: () => ({ t: key => key }) };
    if (name in mocks) return mocks[name];
    if (name === "@/icons") return { EyeIcon: "eye", EyeCloseIcon: "eye-close" };
    if (name.startsWith("@/components/") || name === "./EmailVerificationForm") return { default: name };
    throw Error(name);
  } });
  return () => { cursor = 0; return exports.default(props); };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const find = (tree, predicate) => { const node = nodes(tree).find(predicate); assert.ok(node); return node; };
const flush = () => new Promise(resolve => setImmediate(resolve));

test("sending the registration email shows verification, never registration success", async () => {
  let saved;
  const render = mount("SignUpForm", {
    "@/lib/api": { isLocalTestMode: false, signUpCustomer: async () => "verificationRequired", apiErrorKey: e => e.message },
    "react-router": { Link: "link" },
    "@/lib/pending-signup": { readPendingSignup: () => null, storePendingSignup: value => { saved = value; } },
  });
  await find(render(), n => n.type === "form").props.onSubmit({ preventDefault() {}, currentTarget: {
    fname: "Test", lname: "Customer", email: "customer@example.test", password: "Example123", reset() {},
  } });
  const tree = render();
  assert.equal(saved.email, "customer@example.test");
  assert.equal(find(tree, n => n.type === "./EmailVerificationForm").props.pending.email, saved.email);
  assert.equal(nodes(tree).some(n => n.props?.role === "status"), false);
  assert.ok(nodes(tree).some(n => n.props?.children === "emailVerification.stepTwo"));
});

test("invalid code stays on verification; successful verification waits for Continue, and blocks duplicate submissions", async () => {
  let accepted = false; let calls = 0; let refreshed = 0; let navigated = 0; let cleared = false;
  const render = mount("EmailVerificationForm", {
    "@/lib/api": { verifySignupEmail: async (email, code) => {
      calls++; assert.equal(email, "customer@example.test"); assert.equal(code, "123456");
      if (!accepted) throw Error("emailVerification.invalid");
    }, apiErrorKey: e => e.message },
    "@/context/AuthContext": { useAuth: () => ({ refreshUser: async () => { refreshed++; } }) },
    "react-router": { useNavigate: () => () => { navigated++; } },
  }, { pending: { email: "customer@example.test", resendAt: Date.now() + 60000 }, onPendingChange: value => { cleared = value === null; } });
  find(render(), n => n.props?.id === "signup-code").props.onChange({ target: { value: "123456" } });
  const submit = () => find(render(), n => n.type === "form").props.onSubmit({ preventDefault() {} });
  submit(); submit(); await flush();
  assert.equal(calls, 1);
  assert.equal(find(render(), n => n.props?.role === "alert").props.children, "emailVerification.invalid");
  assert.equal(navigated, 0); assert.equal(refreshed, 0); assert.equal(cleared, false);
  accepted = true; submit(); await flush();
  const verified = render();
  assert.equal(find(verified, n => n.props?.role === "status").props.children, "emailVerification.completed");
  assert.equal(nodes(verified).some(n => n.type === "form"), false);
  assert.equal(navigated, 0); assert.equal(refreshed, 0); assert.equal(cleared, false);
  find(verified, n => n.props?.children === "emailVerification.continue").props.onClick(); await flush();
  assert.equal(navigated, 1); assert.equal(refreshed, 1); assert.equal(cleared, true);
});
