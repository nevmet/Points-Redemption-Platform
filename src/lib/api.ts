import type {
  CustomerSummary,
  OrderPointRequestRow,
  PointTransactionInsert,
  PointTransactionRow,
  ProductInsert,
  ProductRow,
  ProductCategoryRow,
  ProductStatus,
  ProductUpdate,
  RedemptionRequestInsert,
  RedemptionRequestRow,
  RedemptionRequestUpdate,
} from "./database";
import { isSupabaseConfigured, requireSupabase } from "./supabase";
import { ApiError, isLocalTestMode, localTestRequest } from "./local-test-client";
import type { AppUser } from "./auth-types";
import { MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES, productImageExtension } from "./product-image";
export { isLocalTestMode } from "./local-test-client";

export async function getCurrentUser(): Promise<AppUser | null> {
  if (isLocalTestMode) return (await localTestRequest<{ user: AppUser | null }>("/session")).user;
  if (!isSupabaseConfigured) return null;
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email || "", username: data.user.user_metadata?.name || data.user.email || "", role: data.user.app_metadata.role === "admin" ? "admin" : "customer" };
}
export async function signIn(username: string, password: string, remember: boolean): Promise<AppUser> {
  if (isLocalTestMode) return (await localTestRequest<{ user: AppUser }>("/signin", "POST", { username, password, remember })).user;
  if (!isSupabaseConfigured) throw new ApiError("unavailable");
  const { error } = await requireSupabase().auth.signInWithPassword({ email: username.trim(), password });
  if (error) throw new ApiError("credentials");
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  return user;
}
export async function signOut(): Promise<void> {
  if (isLocalTestMode) { await localTestRequest("/signout", "POST"); return; }
  if (isSupabaseConfigured) { const { error } = await requireSupabase().auth.signOut(); if (error) throw new ApiError("failed"); }
}
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!currentPassword || currentPassword.length > 256) throw new ApiError("currentPassword");
  if (newPassword.length < 8 || newPassword.length > 128) throw new ApiError("passwordLength");
  if (currentPassword === newPassword) throw new ApiError("samePassword");
  if (isLocalTestMode) { await localTestRequest("/password", "PATCH", { currentPassword, newPassword }); return; }
  if (!isSupabaseConfigured) throw new ApiError("unavailable");
  const client = requireSupabase();
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user?.email) throw new ApiError("signin");
  // Reauthenticate the same account even when the provider's current-password setting is disabled.
  const { data: verified, error: verificationError } = await client.auth.signInWithPassword({ email: identity.user.email, password: currentPassword });
  if (verificationError) throw new ApiError(verificationError.code === "invalid_credentials" ? "currentPassword" : verificationError.status === 429 ? "retryLater" : "failed");
  if (verified.user?.id !== identity.user.id) throw new ApiError("signin");
  const { error } = await client.auth.updateUser({ password: newPassword, current_password: currentPassword });
  if (error) throw new ApiError(error.code === "same_password" ? "samePassword" : error.code === "weak_password" ? "weakPassword" : error.code === "reauthentication_needed" ? "reauthenticate" : error.status === 429 ? "retryLater" : "failed");
}

export function apiErrorKey(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "failed";
  if (["redemptionState", "resolutionRequired"].includes(code)) return "portalFixes." + code;
  if (["currentPassword", "passwordLength", "samePassword", "weakPassword", "reauthenticate"].includes(code)) return `passwordChange.${code}`;
  if (["emailExists", "adjustmentConflict"].includes(code)) return "customerManager." + code;
  if (code === "optionInvalid" || code === "optionUnavailable") return "productOptions." + code;
  if (code === "imageSize" || code === "imageType") return `catalogEditor.${code}`;
  if (["categoryInUse", "categoryInvalid", "categoryDuplicate"].includes(code)) return `categoryManager.${code}`;
  if (code === "productNotDraft") return `adminProducts.${code}`;
  if (["variantInvalid", "variantUnavailable", "priceChanged"].includes(code)) return `productVariants.${code}`;
  return `testAuth.errors.${["credentials", "signin", "forbidden", "unavailable", "invalid", "notFound", "insufficient", "retryLater"].includes(code) ? code : "failed"}`;
}

export const PRODUCT_IMAGES_BUCKET = "product-images";

export async function listProductCategories(): Promise<ProductCategoryRow[]> {
  if (isLocalTestMode) return localTestRequest("/categories");
  const { data, error } = await requireSupabase().from("product_categories").select("*").order("created_at").order("name");
  if (error) throw error;
  return data ?? [];
}
export async function saveProductCategory(name: string, id?: string): Promise<ProductCategoryRow> {
  name = name.trim();
  if (!name || name.length > 80) throw new ApiError("categoryInvalid");
  if (isLocalTestMode) return localTestRequest(id ? `/categories/${encodeURIComponent(id)}` : "/categories", id ? "PATCH" : "POST", { name });
  const client = requireSupabase();
  const query = id ? client.from("product_categories").update({ name }).eq("id", id) : client.from("product_categories").insert({ name });
  const { data, error } = await query.select("*").single();
  if (error?.code === "23505") throw new ApiError("categoryDuplicate");
  if (error) throw error;
  return data;
}
export async function deleteProductCategory(id: string): Promise<void> {
  if (isLocalTestMode) { await localTestRequest(`/categories/${encodeURIComponent(id)}`, "DELETE"); return; }
  const { error } = await requireSupabase().from("product_categories").delete().eq("id", id);
  if (error?.code === "23503") throw new ApiError("categoryInUse");
  if (error) throw error;
}

export async function listMyPointTransactions(): Promise<PointTransactionRow[]> {
  if (isLocalTestMode) return localTestRequest("/transactions");
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  return listPointTransactions(user.email);
}
export async function listGiftRequests(forReview = false): Promise<RedemptionRequestRow[]> {
  if (isLocalTestMode) return localTestRequest(`/redemptions${forReview ? "?review=1" : ""}`);
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  if (forReview && user.role !== "admin") throw new ApiError("forbidden");
  return listRedemptionRequests(forReview ? undefined : user.email);
}
const redemptionAttempts = new Map<string, string>();
export async function redeemGift(productId: string, variantId?: string, expectedPoints?: number, selectedOptions?: { optionId: string; value: string }[]): Promise<RedemptionRequestRow> {
  if (isLocalTestMode) {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("signin");
    const key = "bags-star:redeem:" + user.id + ":" + JSON.stringify([productId, variantId, expectedPoints, selectedOptions]);
    let operationId = redemptionAttempts.get(key);
    try { operationId ||= sessionStorage.getItem(key) || undefined; } catch { /* memory fallback */ }
    operationId ||= crypto.randomUUID(); redemptionAttempts.set(key, operationId);
    try { sessionStorage.setItem(key, operationId); } catch { /* memory fallback */ }
    const result = await localTestRequest<RedemptionRequestRow>("/redemptions", "POST", { productId, variantId, expectedPoints, selectedOptions, operationId });
    redemptionAttempts.delete(key); try { sessionStorage.removeItem(key); } catch { /* memory fallback */ }
    return result;
  }
  // Production gift debits need an atomic database RPC before enabling submission.
  throw new ApiError("unavailable");
}

export type ProductFilters = {
  status?: ProductStatus;
  category?: string;
  search?: string;
};

export async function listProducts(filters: ProductFilters = {}): Promise<ProductRow[]> {
  if (isLocalTestMode) return (await localTestRequest<ProductRow[]>("/products")).filter((p) => (!filters.status || p.status === filters.status) && (!filters.category || p.category === filters.category) && (!filters.search || p.name.toLowerCase().includes(filters.search.toLowerCase())));
  const client = requireSupabase();
  let query = client.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.search?.trim()) {
    query = query.ilike("name", `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProduct(id: string): Promise<ProductRow> {
  if (isLocalTestMode) { const product = (await listProducts()).find((p) => p.id === id); if (!product) throw new ApiError("notFound"); return product; }
  const { data, error } = await requireSupabase().from("products").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createProduct(input: ProductInsert): Promise<ProductRow> {
  if (isLocalTestMode) return localTestRequest("/products", "POST", input);
  const { data, error } = await requireSupabase().from("products").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, input: ProductUpdate): Promise<ProductRow> {
  if (isLocalTestMode) return localTestRequest(`/products/${encodeURIComponent(id)}`, "PATCH", input);
  const { data, error } = await requireSupabase().from("products").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<ProductRow> {
  return updateProduct(id, { status });
}

export async function deleteDraftProduct(id: string): Promise<void> {
  if (isLocalTestMode) { await localTestRequest(`/products/${encodeURIComponent(id)}`, "DELETE"); return; }
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  if (user.role !== "admin") throw new ApiError("forbidden");
  // Status is part of the delete query, so a concurrent publish cannot be deleted.
  const { data, error } = await requireSupabase().from("products").delete().eq("id", id).eq("status", "draft").select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("productNotDraft");
}

export async function uploadProductImage(file: File): Promise<string> {
  if (!file.size || file.size > MAX_PRODUCT_IMAGE_BYTES) throw new ApiError("imageSize");
  const extension = productImageExtension(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!extension || file.type !== PRODUCT_IMAGE_TYPES[extension]) throw new ApiError("imageType");
  if (isLocalTestMode) return (await localTestRequest<{ url: string }>("/product-images", "POST", file)).url;
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  if (user.role !== "admin") throw new ApiError("forbidden");
  const client = requireSupabase();
  const filePath = `catalog/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from(PRODUCT_IMAGES_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function listRedemptionRequests(customerEmail?: string): Promise<RedemptionRequestRow[]> {
  let query = requireSupabase().from("redemption_requests").select("*").order("created_at", { ascending: false });
  if (customerEmail) {
    query = query.eq("customer_email", customerEmail);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createRedemptionRequest(input: RedemptionRequestInsert): Promise<RedemptionRequestRow> {
  const { data, error } = await requireSupabase().from("redemption_requests").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateRedemptionRequest(id: string, input: RedemptionRequestUpdate): Promise<RedemptionRequestRow> {
  if (isLocalTestMode) return localTestRequest(`/redemptions/${encodeURIComponent(id)}`, "PATCH", { status: input.status });
  const { data, error } = await requireSupabase().from("redemption_requests").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function setRedemptionRequestStatus(id: string, status: RedemptionRequestRow["status"], note = ""): Promise<RedemptionRequestRow> {
  if (isLocalTestMode) return localTestRequest("/redemptions/" + encodeURIComponent(id), "PATCH", { status, note });
  // Status changes and refunds must be atomic in the production database.
  throw new ApiError("unavailable");
}

export async function listPointTransactions(customerEmail?: string): Promise<PointTransactionRow[]> {
  const rows: PointTransactionRow[] = [];
  const pageSize = 500;
  // Page through the ledger instead of silently truncating at the API row limit.
  for (let offset = 0; ; offset += pageSize) {
    let query = requireSupabase().from("point_transactions").select("*")
      .order("created_at", { ascending: false }).order("id", { ascending: false });
    if (customerEmail) query = query.eq("customer_email", customerEmail);
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

export async function createPointTransaction(input: PointTransactionInsert): Promise<PointTransactionRow> {
  const { data, error } = await requireSupabase().from("point_transactions").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export type OrderPointsErrorCode = "unavailable" | "signin" | "forbidden" | "duplicate" | "reviewed" | "changed" | "failed";

export class OrderPointsError extends Error {
  readonly code: OrderPointsErrorCode;
  constructor(code: OrderPointsErrorCode) {
    super(code);
    this.code = code;
    this.name = "OrderPointsError";
  }
}

export function orderPointsErrorCode(error: unknown): OrderPointsErrorCode {
  if (error instanceof ApiError && ["signin", "forbidden", "duplicate", "reviewed", "changed", "unavailable"].includes(error.code)) return error.code as OrderPointsErrorCode;
  return error instanceof OrderPointsError ? error.code : "failed";
}

async function orderPointsUser(forReview = false) {
  if (!isSupabaseConfigured) throw new OrderPointsError("unavailable");
  const { data, error } = await requireSupabase().auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw new OrderPointsError("failed");
  if (!data.user) throw new OrderPointsError("signin");
  if (forReview && data.user.app_metadata.role !== "admin") throw new OrderPointsError("forbidden");
  return data.user;
}

function throwOrderPointsError(error: { code?: string; message: string }): never {
  if (error.code === "23505") throw new OrderPointsError("duplicate");
  if (error.message === "order_points_already_reviewed") throw new OrderPointsError("reviewed");
  if (error.message === "order_points_changed") throw new OrderPointsError("changed");
  if (error.message === "order_points_forbidden") throw new OrderPointsError("forbidden");
  if (error.message === "order_points_signin") throw new OrderPointsError("signin");
  throw new OrderPointsError("failed");
}

export async function listOrderPointRequests(forReview = false): Promise<OrderPointRequestRow[]> {
  if (isLocalTestMode) return localTestRequest(`/orders${forReview ? "?review=1" : ""}`);
  const user = await orderPointsUser(forReview);
  let query = requireSupabase().from("order_point_requests").select("*").order("created_at", { ascending: false });
  if (!forReview) query = query.eq("customer_id", user.id);
  const { data, error } = await query;
  if (error) throwOrderPointsError(error);
  return data ?? [];
}

export async function submitOrderPointRequest(orderNumber: string): Promise<OrderPointRequestRow> {
  if (isLocalTestMode) return localTestRequest("/orders", "POST", { orderNumber: orderNumber.trim() });
  await orderPointsUser();
  const normalized = orderNumber.trim();
  if (!normalized || normalized.length > 100) throw new OrderPointsError("failed");
  const { data, error } = await requireSupabase().rpc("submit_order_point_request", { p_order_number: normalized }).single();
  if (error) throwOrderPointsError(error);
  return data;
}

export async function updateOrderPointRequest(id: string, orderNumber: string): Promise<OrderPointRequestRow> {
  const normalized = orderNumber.trim();
  if (!normalized || normalized.length > 100) throw new OrderPointsError("failed");
  if (isLocalTestMode) return localTestRequest(`/orders/${encodeURIComponent(id)}/details`, "PATCH", { orderNumber: normalized });
  await orderPointsUser();
  const { data, error } = await requireSupabase().rpc("update_order_point_request", { p_request_id: id, p_order_number: normalized }).single();
  if (error) throwOrderPointsError(error);
  return data;
}

export async function reviewOrderPointRequest(id: string, approve: boolean, points: number | null, note: string, expectedOrderNumber?: string): Promise<OrderPointRequestRow> {
  if (isLocalTestMode) return localTestRequest(`/orders/${encodeURIComponent(id)}`, "PATCH", { approve, points: approve ? points : null, note, expectedOrderNumber });
  await orderPointsUser(true);
  if ((approve && (!Number.isInteger(points) || (points ?? 0) <= 0 || (points ?? 0) > 2147483647)) || note.length > 1000) {
    throw new OrderPointsError("failed");
  }
  const args = {
    p_request_id: id, p_approve: approve, p_points: approve ? points : null, p_note: note.trim(),
  };
  const query = expectedOrderNumber === undefined
    ? requireSupabase().rpc("review_order_point_request", args)
    : requireSupabase().rpc("review_current_order_point_request", { ...args, p_expected_order_number: expectedOrderNumber });
  const { data, error } = await query.single();
  if (error) throwOrderPointsError(error);
  return data;
}

export async function signUpCustomer(name: string, email: string, password: string): Promise<void> {
  if (isLocalTestMode) { await localTestRequest("/signup", "POST", { name, email, password }); return; }
  if (!isSupabaseConfigured) throw new ApiError("unavailable");
  const { error } = await requireSupabase().auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw new ApiError(error.code === "user_already_exists" ? "emailExists" : "failed");
}
async function requireAdminCustomerAccess() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  if (user.role !== "admin") throw new ApiError("forbidden");
}
function customerRpcError(error: { message: string }): never {
  throw new ApiError(["forbidden", "notFound", "invalid", "insufficient", "adjustmentConflict"].includes(error.message) ? error.message : "failed");
}
export async function listAdminCustomers(): Promise<CustomerSummary[]> {
  if (isLocalTestMode) return localTestRequest("/customers");
  await requireAdminCustomerAccess();
  const { data, error } = await requireSupabase().rpc("list_admin_customers");
  if (error) customerRpcError(error);
  return data || [];
}
export async function listCustomerTransactions(id: string): Promise<PointTransactionRow[]> {
  if (isLocalTestMode) return localTestRequest("/customers/" + encodeURIComponent(id) + "/transactions");
  await requireAdminCustomerAccess();
  const { data, error } = await requireSupabase().rpc("list_admin_customer_transactions", { p_customer_id: id });
  if (error) customerRpcError(error);
  return data || [];
}
export async function adjustCustomerPoints(id: string, type: "credit" | "debit", points: number, note: string, operationId: string): Promise<PointTransactionRow> {
  if (!Number.isInteger(points) || points <= 0 || points > 2147483647 || note.length > 1000) throw new ApiError("invalid");
  if (isLocalTestMode) return localTestRequest("/customers/" + encodeURIComponent(id) + "/points", "POST", { type, points, note: note.trim(), operationId });
  await requireAdminCustomerAccess();
  const { data, error } = await requireSupabase().rpc("adjust_customer_points", { p_customer_id: id, p_type: type, p_points: points, p_note: note.trim(), p_operation_id: operationId });
  if (error) customerRpcError(error);
  return data;
}

export type CustomerProfile = { name: string; email: string; company: string; phone: string };
export async function getMyProfile(): Promise<CustomerProfile> {
  if (isLocalTestMode) return localTestRequest("/profile");
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user) throw new ApiError("signin");
  const meta = data.user.user_metadata;
  return { name: String(meta.name || ""), email: data.user.email || "", company: String(meta.company || ""), phone: String(meta.phone || "") };
}
export async function saveMyProfile(profile: Omit<CustomerProfile, "email">): Promise<void> {
  const values = { name: profile.name.trim(), company: profile.company.trim(), phone: profile.phone.trim() };
  if (!values.name || values.name.length > 120 || values.company.length > 160 || values.phone.length > 50) throw new ApiError("invalid");
  if (isLocalTestMode) { await localTestRequest("/profile", "PATCH", values); return; }
  const { error } = await requireSupabase().auth.updateUser({ data: values });
  if (error) throw error;
}
export type NotificationFeed = { transactions: PointTransactionRow[]; orders: OrderPointRequestRow[]; gifts: RedemptionRequestRow[]; readIds: string[] };
export async function listMyNotificationFeed(): Promise<NotificationFeed> {
  if (isLocalTestMode) return localTestRequest("/notification-feed");
  const client = requireSupabase();
  const { data: identity, error: authError } = await client.auth.getUser();
  if (authError || !identity.user?.email) throw new ApiError("signin");
  const user = identity.user;
  const results = await Promise.all([
    client.from("point_transactions").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(50),
    client.from("order_point_requests").select("*").eq("customer_id", user.id).order("reviewed_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(50),
    client.from("redemption_requests").select("*").eq("customer_email", user.email!).order("updated_at", { ascending: false }).limit(50),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const saved: unknown = user.user_metadata.notification_read_ids;
  return { transactions: results[0].data || [], orders: results[1].data || [], gifts: results[2].data || [], readIds: Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : [] };
}
export async function markMyNotificationsRead(ids: string[]): Promise<string[]> {
  if (isLocalTestMode) return localTestRequest("/notification-reads", "PATCH", { ids: ids.slice(-300) });
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new ApiError("signin");
  const saved: unknown = data.user.user_metadata.notification_read_ids;
  const merged = [...new Set([...(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []), ...ids])].slice(-300);
  const update = await client.auth.updateUser({ data: { notification_read_ids: merged } });
  if (update.error) throw update.error;
  return merged;
}
