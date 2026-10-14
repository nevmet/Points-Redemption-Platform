// Local development fixtures only. This middleware is never served by a production build.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import type { AppUser } from "../src/lib/auth-types.ts";
import type { OrderPointRequestRow, PointTransactionRow, ProductRow, RedemptionRequestRow, ProductCategoryRow } from "../src/lib/database.ts";
import { rewardProducts } from "../src/data/rewards.ts";
import { validateProductOptions, resolveProductOptions } from "../src/lib/product-options.ts";
import { validateProductVariants } from "../src/lib/product-variants.ts";
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES, productImageExtension } from "../src/lib/product-image.ts";

const accounts: AppUser[] = [
  { id: "test-customer-01", username: "user01", email: "user01@example.test", role: "customer" },
  { id: "test-admin", username: "admin", email: "admin@example.test", role: "admin" },
];
const passwordDigest = Buffer.from("d8bd8288cd075a805f818123e3d98c1315af8ef680c3af254243a61880b4d10d2825e5ac368fd623a11b295b00c8d74c45cab2907d489de8739d7ff88c3fbebf", "hex");
type RegisteredCustomer = AppUser & { salt: string; digest: string; created_at: string };
type State = { profiles?: Record<string, { name: string; company: string; phone: string }>; notificationReads?: Record<string, string[]>; credentials?: Record<string, { salt: string; digest: string }>; customers?: RegisteredCustomer[]; version: 1; categories: ProductCategoryRow[]; products: ProductRow[]; orders: OrderPointRequestRow[]; redemptions: RedemptionRequestRow[]; transactions: PointTransactionRow[] };
class HttpError extends Error {
  status: number;
  constructor(status: number, code: string) { super(code); this.status = status; }
}
const fail = (code: string, status = 400): never => { throw new HttpError(status, code); };
const adminOnly = (user: AppUser) => { if (user.role !== "admin") fail("forbidden", 403); };
const text = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value.trim() : fail("invalid");
const amount = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 2147483647 ? value : fail("invalid");
const now = () => new Date().toISOString();
const initialCategories = (): ProductCategoryRow[] => ["Apple", "Louis Vuitton"].map((name) => ({ id: randomUUID(), name, created_at: now() }));

function initialState(): State {
  return { version: 1, categories: initialCategories(), orders: [], redemptions: [], transactions: [], products: rewardProducts.map((p) => ({
    id: String(p.id), name: p.name, category: "Apple", description: p.description,
    points: p.points, image_url: p.image, featured: Boolean(p.featured), sort_order: p.id,
    status: p.status === "Published" ? "published" : "draft", created_at: now(), updated_at: now(),
  })) };
}

export function createTestBackend(file: string, imageDirectory = resolve(dirname(file), "uploads")) {
  let state: State = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : initialState();
  const sessions = new Map<string, { user: AppUser; expires: number }>();
  const attempts = new Map<string, { count: number; until: number }>();
  const commit = (next: State) => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, JSON.stringify(next, null, 2));
    renameSync(`${file}.tmp`, file);
    state = next;
  };
  // One-time upgrade: the user requested all existing demo products under Apple.
  if (!state.categories) commit({ ...state, categories: initialCategories(), products: state.products.map((product) => ({ ...product, category: "Apple" })) });
  const allAccounts = () => [...accounts, ...(state.customers || [])].map((account) => ({ ...account, username: state.profiles?.[account.id]?.name || account.username }));
  const passwordMatches = (id: string | undefined, password: string) => {
    const stored = id ? state.credentials?.[id] || state.customers?.find((account) => account.id === id) : undefined;
    return timingSafeEqual(scryptSync(password, stored?.salt || "bags-star-local-test-v1", 64), stored ? Buffer.from(stored.digest, "hex") : passwordDigest);
  };
  const customerSummary = (account: AppUser) => {
    const rows = state.transactions.filter((row) => row.customer_id === account.id);
    const total_credit = rows.filter((row) => row.type === "credit").reduce((sum, row) => sum + row.points, 0);
    const total_debit = rows.filter((row) => row.type === "debit").reduce((sum, row) => sum + row.points, 0);
    return { id: account.id, username: account.username, email: account.email, created_at: state.customers?.find((row) => row.id === account.id)?.created_at || null, balance: total_credit - total_debit, total_credit, total_debit };
  };
  const balance = (user: AppUser) => state.transactions.filter((p) => p.customer_id === user.id).reduce((sum, p) => sum + (p.type === "credit" ? p.points : -p.points), 0);
  const readBody = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
    let body = "";
    for await (const chunk of req) {
      body += chunk.toString();
      if (body.length > 16384) fail("invalid", 413);
    }
    try { const value: unknown = JSON.parse(body || "{}"); if (!value || typeof value !== "object" || Array.isArray(value)) fail("invalid"); return value as Record<string, unknown>; }
    catch { return fail("invalid"); }
  };
  return async (req: IncomingMessage, res: ServerResponse) => {
    const send = (data: unknown, status = 200) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(data)); };
    try {
      const host = req.headers.host || "";
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress || "")) fail("forbidden", 403);
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) fail("forbidden", 403);
      if (req.headers.origin && req.headers.origin !== `http://${host}` && req.headers.origin !== `https://${host}`) fail("forbidden", 403);
      if (req.headers["sec-fetch-site"] === "cross-site") fail("forbidden", 403);
      const url = new URL(req.url || "/", `http://${host}`);
      const path = url.pathname.replace(/^\/api\/local-test/, "");
      const token = req.headers.cookie?.match(/(?:^|;\s*)bags_test_session=([a-f0-9]+)/)?.[1] || "";
      const session = sessions.get(token);
      const user = session && session.expires > Date.now() ? session.user : null;
      if (session && !user) sessions.delete(token);
      const method = req.method || "GET";
      if (path === "/product-images" && method === "POST") {
        if (!user) return fail("signin", 401);
        adminOnly(user);
        if (Number(req.headers["content-length"]) > MAX_PRODUCT_IMAGE_BYTES) fail("imageSize", 413);
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          const bytes = Buffer.from(chunk);
          size += bytes.length;
          if (size > MAX_PRODUCT_IMAGE_BYTES) fail("imageSize", 413);
          chunks.push(bytes);
        }
        if (!size) fail("imageSize");
        const bytes = Buffer.concat(chunks);
        const extension = productImageExtension(bytes);
        if (!extension || req.headers["content-type"] !== PRODUCT_IMAGE_TYPES[extension]) return fail("imageType");
        const name = `${randomUUID()}.${extension}`;
        mkdirSync(imageDirectory, { recursive: true });
        writeFileSync(resolve(imageDirectory, name), bytes, { flag: "wx" });
        return send({ url: `/images/products/uploads/${name}` }, 201);
      }
      const body = method === "POST" || method === "PATCH" ? await readBody(req) : {};

      if (path === "/session" && method === "GET") return send({ user });
      if (path === "/signup" && method === "POST") {
        const key = "signup:" + req.socket.remoteAddress;
        const attempt = attempts.get(key);
        if (attempt && attempt.until > Date.now() && attempt.count >= 20) fail("retryLater", 429);
        attempts.set(key, { count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1, until: Date.now() + 60000 });
        const username = text(body.name, 120); const email = text(body.email, 254).toLowerCase();
        if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) fail("invalid");
        if (allAccounts().some((account) => account.email.toLowerCase() === email)) fail("emailExists", 409);
        const password = typeof body.password === "string" ? body.password : fail("invalid");
        const salt = randomBytes(16).toString("hex");
        const customer: RegisteredCustomer = { id: randomUUID(), username, email, role: "customer", salt, digest: scryptSync(password, salt, 64).toString("hex"), created_at: now() };
        commit({ ...state, customers: [...(state.customers || []), customer] });
        return send({ ok: true }, 201);
      }
      if (path === "/signin" && method === "POST") {
        const key = req.socket.remoteAddress || "local";
        const attempt = attempts.get(key);
        if (attempt && attempt.until > Date.now() && attempt.count >= 20) fail("retryLater", 429);
        const username = text(body.username, 120);
        const password = typeof body.password === "string" && body.password.length <= 256 ? body.password : fail("invalid");
        const registered = state.customers?.find((a) => a.email.toLowerCase() === username.toLowerCase());
        const identity = registered || accounts.find((a) => a.username === username || a.email === username);
        const account = identity ? { ...identity, username: state.profiles?.[identity.id]?.name || identity.username } : undefined;
        const matches = passwordMatches(account?.id, password);
        if (!account || !matches) {
          attempts.set(key, { count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1, until: Date.now() + 60000 });
          return fail("credentials", 401);
        }
        attempts.delete(key);
        sessions.delete(token);
        const sessionToken = randomBytes(32).toString("hex");
        const seconds = body.remember === true ? 7 * 86400 : 8 * 3600;
        const publicAccount: AppUser = { id: account.id, username: account.username, email: account.email, role: account.role };
        sessions.set(sessionToken, { user: publicAccount, expires: Date.now() + seconds * 1000 });
        res.setHeader("Set-Cookie", `bags_test_session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/${body.remember === true ? `; Max-Age=${seconds}` : ""}`);
        return send({ user: publicAccount });
      }
      if (path === "/signout" && method === "POST") {
        sessions.delete(token);
        res.setHeader("Set-Cookie", "bags_test_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
        return send({ ok: true });
      }
      if (!user) return fail("signin", 401);

      if (path === "/password" && method === "PATCH") {
        const key = `password:${user.id}`;
        const attempt = attempts.get(key);
        if (attempt && attempt.until > Date.now() && attempt.count >= 5) fail("retryLater", 429);
        attempts.set(key, { count: attempt && attempt.until > Date.now() ? attempt.count + 1 : 1, until: attempt && attempt.until > Date.now() ? attempt.until : Date.now() + 60000 });
        const { currentPassword, newPassword } = body;
        if (typeof currentPassword !== "string" || !currentPassword || currentPassword.length > 256) return fail("invalid");
        if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 128) return fail("passwordLength");
        if (!passwordMatches(user.id, currentPassword)) fail("currentPassword", 400);
        if (currentPassword === newPassword) fail("samePassword");
        const salt = randomBytes(16).toString("hex");
        const credential = { salt, digest: scryptSync(newPassword, salt, 64).toString("hex") };
        const registered = state.customers?.some((account) => account.id === user.id);
        commit(registered
          ? { ...state, customers: state.customers?.map((account) => account.id === user.id ? { ...account, ...credential } : account) }
          : { ...state, credentials: { ...state.credentials, [user.id]: credential } });
        for (const [sessionToken, other] of sessions) if (other.user.id === user.id && sessionToken !== token) sessions.delete(sessionToken);
        attempts.delete(key);
        return send({ ok: true });
      }

      if (path === "/customers" && method === "GET") {
        adminOnly(user); return send(allAccounts().filter((account) => account.role === "customer").map(customerSummary));
      }
      if (path.startsWith("/customers/")) {
        adminOnly(user);
        const [, , customerId, action] = path.split("/");
        const customer = allAccounts().find((account) => account.id === customerId && account.role === "customer");
        if (!customer) return fail("notFound", 404);
        if (action === "transactions" && method === "GET") return send(state.transactions.filter((row) => row.customer_id === customer.id));
        if (action === "points" && method === "POST") {
          const points = amount(body.points); const note = text(body.note ?? "", 1000);
          const operationId = text(body.operationId, 80);
          if (!/^[a-f0-9-]{36}$/i.test(operationId) || !["credit", "debit"].includes(String(body.type))) fail("invalid");
          const previous = state.transactions.find((row) => row.operation_id === operationId);
          if (previous) {
            if (previous.customer_id !== customer.id || previous.created_by !== user.id || previous.type !== body.type || previous.points !== points || previous.description !== note) fail("adjustmentConflict", 409);
            return send(previous);
          }
          const after = balance(customer) + (body.type === "credit" ? points : -points);
          if (after < 0) fail("insufficient", 409);
          if (!Number.isSafeInteger(after)) fail("invalid");
          const transaction: PointTransactionRow = { id: randomUUID(), customer_id: customer.id, customer_email: customer.email, description: note, points, type: body.type as "credit" | "debit", order_point_request_id: null, created_at: now(), created_by: user.id, operator_name: user.username, operation_id: operationId, balance_after: after };
          commit({ ...state, transactions: [transaction, ...state.transactions] }); return send(transaction, 201);
        }
        return fail("notFound", 404);
      }
      if (path === "/categories" && method === "GET") return send(state.categories);
      if ((path === "/categories" && method === "POST") || (path.startsWith("/categories/") && ["PATCH", "DELETE"].includes(method))) {
        adminOnly(user);
        const id = path.split("/")[2];
        const previous = state.categories.find((category) => category.id === id);
        if (method !== "POST" && !previous) return fail("notFound", 404);
        if (method === "DELETE" && previous) {
          if (state.products.some((product) => product.category === previous.name)) fail("categoryInUse", 409);
          commit({ ...state, categories: state.categories.filter((category) => category.id !== id) });
          return send({ ok: true });
        }
        const name = text(body.name, 80);
        if (!name) fail("categoryInvalid");
        if (state.categories.some((category) => category.id !== previous?.id && category.name.toLowerCase() === name.toLowerCase())) fail("categoryDuplicate", 409);
        const category = previous ? { ...previous, name } : { id: randomUUID(), name, created_at: now() };
        commit({ ...state, categories: previous ? state.categories.map((entry) => entry.id === id ? category : entry) : [...state.categories, category], products: previous ? state.products.map((product) => product.category === previous.name ? { ...product, category: name, updated_at: now() } : product) : state.products });
        return send(category, previous ? 200 : 201);
      }

      if (path === "/products" && method === "GET") return send(state.products.filter((p) => user.role === "admin" || p.status === "published"));
      if (path.startsWith("/products/") && method === "DELETE") {
        adminOnly(user);
        const product = state.products.find((entry) => entry.id === path.split("/")[2]);
        if (!product) return fail("notFound", 404);
        if (product.status !== "draft") fail("productNotDraft", 409);
        // Keep historical request snapshots even after the catalog entry is removed.
        const redemptions = state.redemptions.map((request) => request.product_id === product.id
          ? { ...request, product_id: null, product_name: request.product_name || product.name }
          : request);
        commit({ ...state, products: state.products.filter((entry) => entry.id !== product.id), redemptions });
        return send({ ok: true });
      }
      if ((path === "/products" && method === "POST") || (path.startsWith("/products/") && method === "PATCH")) {
        adminOnly(user);
        const id = path.split("/")[2];
        const previous = state.products.find((p) => p.id === id);
        if (method === "PATCH" && !previous) fail("notFound", 404);
        const product: ProductRow = previous ? { ...previous } : { id: randomUUID(), name: "", category: "", points: 1, description: "", image_url: null, status: "draft", featured: false, sort_order: state.products.length, created_at: now(), updated_at: now() };
        if (body.name !== undefined) product.name = text(body.name, 200);
        if (!product.name) fail("invalid");
        if (body.description !== undefined) product.description = text(body.description, 5000);
        if (body.category !== undefined) product.category = text(body.category, 80);
        if (!state.categories.some((category) => category.name === product.category)) fail("categoryInvalid");
        if (body.points !== undefined) product.points = amount(body.points);
        if (body.variants !== undefined) {
          try { product.variants = validateProductVariants(body.variants); }
          catch { fail("variantInvalid"); }
        }
        if (body.options !== undefined) {
          try { product.options = validateProductOptions(body.options); }
          catch { fail("optionInvalid"); }
        }
        if (product.variants?.length) product.points = Math.min(...product.variants.map((variant) => variant.points));
        if (body.image_url !== undefined) {
          const image = body.image_url === null ? "" : text(body.image_url, 2000);
          if (image && !/^https?:\/\//i.test(image) && !/^\/images\//.test(image)) fail("invalid");
          product.image_url = image || null;
        }
        if (body.image_urls !== undefined) {
          if (!Array.isArray(body.image_urls) || body.image_urls.length > MAX_PRODUCT_IMAGES) fail("invalid");
          product.image_urls = (body.image_urls as unknown[]).map((value) => {
            const image = text(value, 2000);
            if (!/^https?:\/\//i.test(image) && !/^\/images\//.test(image)) fail("invalid");
            return image;
          });
          product.image_url = product.image_urls[0] || null;
        }
        if (body.status !== undefined) { if (body.status !== "published" && body.status !== "draft") return fail("invalid"); product.status = body.status; }
        if (body.featured !== undefined) { if (typeof body.featured !== "boolean") return fail("invalid"); product.featured = body.featured; }
        product.updated_at = now();
        commit({ ...state, products: previous ? state.products.map((p) => p.id === id ? product : p) : [...state.products, product] });
        return send(product);
      }
      if (path === "/profile" && method === "GET") return send({ name: user.username, company: "", phone: "", ...state.profiles?.[user.id], email: user.email });
      if (path === "/profile" && method === "PATCH") {
        const profile = { name: text(body.name, 120), company: text(body.company, 160), phone: text(body.phone, 50) };
        if (!profile.name) fail("invalid");
        commit({ ...state, profiles: { ...state.profiles, [user.id]: profile } });
        for (const session of sessions.values()) if (session.user.id === user.id) session.user = { ...session.user, username: profile.name };
        return send({ ...profile, email: user.email });
      }
      if (path === "/notification-reads" && method === "GET") return send(state.notificationReads?.[user.id] || []);
      if (path === "/notification-reads" && method === "PATCH") {
        if (!Array.isArray(body.ids) || body.ids.length > 300 || body.ids.some((id) => typeof id !== "string" || id.length > 300)) fail("invalid");
        const ids = [...new Set([...(state.notificationReads?.[user.id] || []), ...(body.ids as string[])])].slice(-300);
        commit({ ...state, notificationReads: { ...state.notificationReads, [user.id]: ids } }); return send(ids);
      }
      if (path === "/notification-feed" && method === "GET") {
        const recent = <T extends { created_at: string }>(rows: T[]) => rows.sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
        return send({ transactions: recent(state.transactions.filter(r => r.customer_id === user.id)), orders: state.orders.filter(r => r.customer_id === user.id).sort((a,b) => (b.reviewed_at || b.created_at).localeCompare(a.reviewed_at || a.created_at)).slice(0,50), gifts: state.redemptions.filter(r => r.customer_email === user.email).sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,50), readIds: state.notificationReads?.[user.id] || [] });
      }
      if (path === "/orders" && method === "GET") {
        const all = url.searchParams.get("review") === "1";
        if (all) adminOnly(user);
        return send(state.orders.filter((r) => all || r.customer_id === user.id));
      }
      if (path === "/orders" && method === "POST") {
        const number = text(body.orderNumber, 100);
        if (!number) fail("invalid");
        if (state.orders.some((r) => r.order_number.toLowerCase() === number.toLowerCase() && (r.customer_id === user.id || r.status === "approved"))) fail("duplicate", 409);
        const request: OrderPointRequestRow = { id: randomUUID(), order_number: number, customer_id: user.id, customer_email: user.email, status: "pending", awarded_points: null, review_note: "", reviewed_at: null, reviewed_by: null, created_at: now() };
        commit({ ...state, orders: [request, ...state.orders] });
        return send(request, 201);
      }
      if (/^\/orders\/[^/]+\/details$/.test(path) && method === "PATCH") {
        const request = state.orders.find((r) => r.id === path.split("/")[2]);
        if (!request || request.customer_id !== user.id) return fail("forbidden", 403);
        if (request.status !== "pending") fail("reviewed", 409);
        const number = text(body.orderNumber, 100);
        if (!number) fail("invalid");
        if (state.orders.some((r) => r.id !== request.id && r.order_number.toLowerCase() === number.toLowerCase() && (r.customer_id === user.id || r.status === "approved"))) fail("duplicate", 409);
        const updated = { ...request, order_number: number };
        commit({ ...state, orders: state.orders.map((r) => r.id === updated.id ? updated : r) });
        return send(updated);
      }
      if (path.startsWith("/orders/") && method === "PATCH") {
        adminOnly(user);
        const request = state.orders.find((r) => r.id === path.split("/")[2]);
        if (!request) return fail("notFound", 404);
        if (request.status !== "pending") fail("reviewed", 409);
        if (typeof body.approve !== "boolean") fail("invalid");
        if (body.expectedOrderNumber !== undefined && body.expectedOrderNumber !== request.order_number) fail("changed", 409);
        const points = body.approve ? amount(body.points) : null;
        if (body.approve && state.orders.some((r) => r.status === "approved" && r.order_number.toLowerCase() === request.order_number.toLowerCase())) fail("duplicate", 409);
        const updated: OrderPointRequestRow = { ...request, status: body.approve ? "approved" : "rejected", awarded_points: points, review_note: text(body.note ?? "", 1000), reviewed_by: user.id, reviewed_at: now() };
        const transactions = points === null ? state.transactions : [{ id: randomUUID(), customer_id: request.customer_id, customer_email: request.customer_email, description: request.order_number, points, type: "credit" as const, order_point_request_id: request.id, created_at: now() }, ...state.transactions];
        commit({ ...state, orders: state.orders.map((r) => r.id === updated.id ? updated : r), transactions });
        return send(updated);
      }
      if (path === "/transactions" && method === "GET") return send(state.transactions.filter((r) => r.customer_id === user.id));
      if (path === "/redemptions" && method === "GET") {
        const all = url.searchParams.get("review") === "1";
        if (all) adminOnly(user);
        return send(state.redemptions.filter((r) => all || r.customer_email === user.email).map((r) => ({ ...r, product_name: r.product_name || state.products.find((p) => p.id === r.product_id)?.name || r.product_id })));
      }
      if (path === "/redemptions" && method === "POST") {
        const operationId = body.operationId === undefined ? undefined : text(body.operationId, 36);
        if (operationId && !/^[a-f0-9-]{36}$/i.test(operationId)) fail("invalid");
        const fingerprint = JSON.stringify([body.productId, body.variantId || null, body.expectedPoints ?? null, body.selectedOptions || []]);
        const previous = operationId && state.redemptions.find(r => r.operation_id === operationId);
        if (previous) {
          if (previous.customer_email !== user.email || previous.operation_fingerprint !== fingerprint) fail("adjustmentConflict", 409);
          return send(previous);
        }
        const product = state.products.find((p) => p.id === body.productId && p.status === "published");
        if (!product) return fail("notFound", 404);
        const variants = product.variants || [];
        const variant = variants.find((entry) => entry.id === body.variantId);
        if ((variants.length && !variant) || (!variants.length && body.variantId)) fail("variantUnavailable", 409);
        const points = variant ? variant.points : product.points;
        if ((variants.length || body.expectedPoints !== undefined) && body.expectedPoints !== points) fail("priceChanged", 409);
        let selectedOptions;
        try { selectedOptions = resolveProductOptions(product.options || [], body.selectedOptions); }
        catch { return fail("optionUnavailable", 409); }
        if (balance(user) < points) fail("insufficient", 409);
        const request: RedemptionRequestRow = { operation_id: operationId, operation_fingerprint: fingerprint, status_history: [{ status: "pending", at: now(), by: user.id, note: "" }], id: randomUUID(), request_code: `REW-${randomBytes(4).toString("hex").toUpperCase()}`, customer_name: user.username, customer_email: user.email, company: null, product_id: product.id, product_name: product.name, variant_id: variant?.id || null, variant_name: variant?.name || null, selected_options: selectedOptions, points, status: "pending", created_at: now(), updated_at: now() };
        const transaction: PointTransactionRow = { id: randomUUID(), customer_id: user.id, customer_email: user.email, description: variant ? `${product.name} · ${variant.name}` : product.name, points, type: "debit", order_point_request_id: null, created_at: now() };
        commit({ ...state, redemptions: [request, ...state.redemptions], transactions: [transaction, ...state.transactions] });
        return send(request, 201);
      }
      if (path.startsWith("/redemptions/") && method === "PATCH") {
        const request = state.redemptions.find(r => r.id === path.split("/")[2]);
        if (!request) return fail("notFound", 404);
        const status = body.status;
        const own = request.customer_email === user.email;
        if (user.role !== "admin" && (!own || status !== "cancelled")) fail("forbidden", 403);
        if (status === request.status) return send(request);
        if (user.role !== "admin" && request.status !== "pending") fail("redemptionState", 409);
        const allowed = request.status === "pending" ? ["processing", "completed", "cancelled", "rejected"] : request.status === "processing" ? ["completed", "rejected"] : [];
        if (typeof status !== "string" || !allowed.includes(status)) return fail("redemptionState", 409);
        const refund = status === "cancelled" || status === "rejected";
        const note = text(body.note ?? "", 1000);
        if (refund && !note) fail("resolutionRequired");
        const at = now();
        const updated: RedemptionRequestRow = { ...request, status: status as RedemptionRequestRow["status"], updated_at: at, resolution_note: refund ? note : request.resolution_note, refunded_at: refund ? at : request.refunded_at, status_history: [...(request.status_history || []), { status: status as RedemptionRequestRow["status"], at, by: user.id, note }] };
        const owner = allAccounts().find(a => a.email === request.customer_email);
        if (refund && !owner) return fail("notFound", 404);
        const transactions = refund && owner ? [{ refund_redemption_id: request.id, id: randomUUID(), customer_id: owner.id, customer_email: owner.email, description: request.request_code, points: request.points, type: "credit" as const, order_point_request_id: null, operation_id: randomUUID(), created_by: user.id, operator_name: user.username, balance_after: balance(owner) + request.points, created_at: at }, ...state.transactions] : state.transactions;
        commit({ ...state, redemptions: state.redemptions.map(r => r.id === updated.id ? updated : r), transactions });
        return send(updated);
      }
      return fail("notFound", 404);
    } catch (error) { send({ error: error instanceof HttpError ? error.message : "failed" }, error instanceof HttpError ? error.status : 500); }
  };
}

export default function localTestBackend(): Plugin {
  return {
    name: "bags-star-local-test-accounts",
    apply: "serve",
    configureServer(server) {
      const handler = createTestBackend(resolve(server.config.root, ".local-test/data.json"), resolve(server.config.root, "public/images/products/uploads"));
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith("/api/local-test/")) void handler(req, res);
        else next();
      });
    },
  };
}
