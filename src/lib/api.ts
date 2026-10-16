import { createUuid } from "./uuid";
import { normalizeShippingAddress, type ShippingAddress } from "./shipping-address";
import type {
  ContactMessageRow,
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
  return { id: data.user.id, email: data.user.email || "", username: data.user.user_metadata?.name || data.user.email || "", role: data.user.app_metadata.role === "admin" ? "admin" : "customer", avatarUrl: await profileAvatarUrl(data.user.id, data.user.user_metadata?.avatar_path) };
}
export async function signIn(username: string, password: string, remember: boolean): Promise<AppUser> {
  if (isLocalTestMode) return (await localTestRequest<{ user: AppUser }>("/signin", "POST", { username, password, remember })).user;
  if (!isSupabaseConfigured) throw new ApiError("unavailable");
  const { error } = await requireSupabase().auth.signInWithPassword({ email: username.trim(), password });
  if (error) {
    if (error.code === "invalid_credentials") throw new ApiError("credentials");
    if (error.code === "email_not_confirmed") throw new ApiError("emailNotConfirmed");
    if (error.code === "user_banned") throw new ApiError("accountBlocked");
    if (error.status === 429) throw new ApiError("retryLater");
    throw new ApiError("unavailable");
  }
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
  if (code === "shippingRequired") return "giftMessages.shippingRequired";
  if (code === "avatarStorageUnavailable" || code === "avatarUploadFailed") return "profileAvatar." + code;
  if (["otpInvalid", "otpFormat", "emailDelivery", "verificationDisabled"].includes(code)) return "emailVerification." + code;
  if (["redemptionState", "resolutionRequired"].includes(code)) return "portalFixes." + code;
  if (["currentPassword", "passwordLength", "samePassword", "weakPassword", "reauthenticate"].includes(code)) return `passwordChange.${code}`;
  if (["emailExists", "adjustmentConflict"].includes(code)) return "customerManager." + code;
  if (code === "optionInvalid" || code === "optionUnavailable") return "productOptions." + code;
  if (code === "imageSize" || code === "imageType") return `catalogEditor.${code}`;
  if (["categoryInUse", "categoryInvalid", "categoryDuplicate"].includes(code)) return `categoryManager.${code}`;
  if (code === "productNotDraft") return `adminProducts.${code}`;
  if (["variantInvalid", "variantUnavailable", "priceChanged"].includes(code)) return `productVariants.${code}`;
  return `testAuth.errors.${["credentials", "emailNotConfirmed", "accountBlocked", "signin", "forbidden", "unavailable", "invalid", "notFound", "insufficient", "retryLater"].includes(code) ? code : "failed"}`;
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
  return listPointTransactions(user.id);
}
export async function listGiftRequests(forReview = false): Promise<RedemptionRequestRow[]> {
  if (isLocalTestMode) return localTestRequest(`/redemptions${forReview ? "?review=1" : ""}`);
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  if (forReview && user.role !== "admin") throw new ApiError("forbidden");
  return listRedemptionRequests(forReview ? undefined : user.id);
}
const redemptionAttempts = new Map<string, string>();
export async function redeemGift(productId: string, variantId?: string, expectedPoints?: number, selectedOptions?: { optionId: string; value: string }[], customerNote = ""): Promise<RedemptionRequestRow> {
  {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("signin");
    customerNote = customerNote.trim();
    if (customerNote.length > 2000) throw new ApiError("invalid");
    const key = "bags-star:redeem:" + user.id + ":" + JSON.stringify([productId, variantId, expectedPoints, selectedOptions, customerNote]);
    let operationId = redemptionAttempts.get(key);
    try { operationId ||= sessionStorage.getItem(key) || undefined; } catch { /* memory fallback */ }
    operationId ||= createUuid(); redemptionAttempts.set(key, operationId);
    try { sessionStorage.setItem(key, operationId); } catch { /* memory fallback */ }
    let result: RedemptionRequestRow;
    if (isLocalTestMode) {
      result = await localTestRequest<RedemptionRequestRow>("/redemptions", "POST", { productId, variantId, expectedPoints, selectedOptions, operationId, customerNote });
    } else {
      if (!Number.isInteger(expectedPoints) || (expectedPoints ?? 0) <= 0) throw new ApiError("invalid");
      const { data, error } = await requireSupabase().rpc("redeem_gift", {
        p_product_id: productId, p_variant_id: variantId ?? null,
        p_customer_note: customerNote, p_expected_points: expectedPoints!, p_selected_options: selectedOptions ?? [], p_operation_id: operationId,
      }).single();
      if (error) giftRpcError(error);
      if (!data) throw new ApiError("failed");
      result = data;
    }
    redemptionAttempts.delete(key); try { sessionStorage.removeItem(key); } catch { /* memory fallback */ }
    return result;
  }
}

function giftRpcError(error: { message: string }): never {
  const codes = ["shippingRequired", "signin", "forbidden", "notFound", "invalid", "insufficient", "adjustmentConflict", "variantUnavailable", "priceChanged", "optionUnavailable", "redemptionState", "resolutionRequired"];
  throw new ApiError(codes.includes(error.message) ? error.message : "failed");
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
  const filePath = `catalog/${createUuid()}.${extension}`;
  const { error: uploadError } = await client.storage.from(PRODUCT_IMAGES_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = client.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function listRedemptionRequests(customerId?: string): Promise<RedemptionRequestRow[]> {
  let query = requireSupabase().from("redemption_requests").select("*").order("created_at", { ascending: false });
  if (customerId) {
    query = query.eq("customer_id", customerId);
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
  const { data, error } = await requireSupabase().rpc("set_gift_request_status", { p_request_id: id, p_status: status, p_note: note.trim() }).single();
  if (error) giftRpcError(error);
  if (!data) throw new ApiError("failed");
  return data;
}

export async function listPointTransactions(customerId?: string): Promise<PointTransactionRow[]> {
  const rows: PointTransactionRow[] = [];
  const pageSize = 500;
  // Page through the ledger instead of silently truncating at the API row limit.
  for (let offset = 0; ; offset += pageSize) {
    let query = requireSupabase().from("point_transactions").select("*")
      .order("created_at", { ascending: false }).order("id", { ascending: false });
    if (customerId) query = query.eq("customer_id", customerId);
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

function signupError(error: { code?: string; status?: number }): never {
  if (error.status === 429 || error.code?.includes("rate_limit")) throw new ApiError("retryLater");
  if (error.code === "otp_expired" || error.code === "otp_disabled") throw new ApiError("otpInvalid");
  if (error.code === "email_address_not_authorized" || error.code === "unexpected_failure") throw new ApiError("emailDelivery");
  if (error.code === "user_already_exists" || error.code === "email_exists") throw new ApiError("emailExists");
  if (error.code === "weak_password") throw new ApiError("weakPassword");
  throw new ApiError("failed");
}

export async function signUpCustomer(name: string, email: string, password: string): Promise<"registered" | "verificationRequired"> {
  if (isLocalTestMode) { await localTestRequest("/signup", "POST", { name, email, password }); return "registered"; }
  if (!isSupabaseConfigured) throw new ApiError("unavailable");
  const { data, error } = await requireSupabase().auth.signUp({ email: email.trim(), password, options: { data: { name } } });
  if (error) signupError(error);
  // A session at signup means email confirmation was disabled in the project.
  if (data.session) {
    await requireSupabase().auth.signOut({ scope: "local" });
    throw new ApiError("verificationDisabled");
  }
  return "verificationRequired";
}

export async function verifySignupEmail(email: string, token: string): Promise<void> {
  if (isLocalTestMode || !isSupabaseConfigured) throw new ApiError("unavailable");
  if (!/^\d{6,10}$/.test(token.trim())) throw new ApiError("otpFormat");
  const { data, error } = await requireSupabase().auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email" });
  if (error) signupError(error);
  if (!data.session || !data.user?.email_confirmed_at) throw new ApiError("otpInvalid");
}

export async function resendSignupEmail(email: string): Promise<void> {
  if (isLocalTestMode || !isSupabaseConfigured) throw new ApiError("unavailable");
  const { error } = await requireSupabase().auth.resend({ email: email.trim(), type: "signup" });
  if (error) signupError(error);
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
export async function getCustomerShippingAddress(id: string): Promise<ShippingAddress | null> {
  if (isLocalTestMode) return localTestRequest("/customers/" + encodeURIComponent(id) + "/shipping-address");
  await requireAdminCustomerAccess();
  const { data, error } = await requireSupabase().rpc("get_admin_customer_shipping_address", { p_customer_id: id });
  if (error) customerRpcError(error);
  return normalizeShippingAddress(data);
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

export type CustomerProfile = { name: string; email: string; company: string; phone: string; avatarUrl?: string | null };
async function profileAvatarUrl(userId: string, path: unknown): Promise<string | null> {
  if (typeof path !== "string" || !path.startsWith(`${userId}/`) || !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(path.slice(userId.length + 1))) return null;
  try {
    const { data, error } = await requireSupabase().storage.from("customer-avatars").createSignedUrl(path, 86400);
    return error ? null : data?.signedUrl || null;
  } catch { return null; } // A missing image must not prevent sign-in or editing other profile fields.
}
export async function validateAvatarFile(file: File): Promise<string> {
  if (!file.size || file.size > MAX_PRODUCT_IMAGE_BYTES) throw new ApiError("imageSize");
  const extension = productImageExtension(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
  if (!extension || file.type !== PRODUCT_IMAGE_TYPES[extension]) throw new ApiError("imageType");
  return extension;
}
export async function getMyShippingAddress(): Promise<ShippingAddress | null> {
  if (isLocalTestMode) return localTestRequest("/shipping-address");
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user) throw new ApiError("signin");
  return normalizeShippingAddress(data.user.user_metadata?.shipping_address);
}
export async function saveMyShippingAddress(address: ShippingAddress): Promise<ShippingAddress> {
  const values = normalizeShippingAddress(address);
  if (!values) throw new ApiError("invalid");
  if (isLocalTestMode) return localTestRequest("/shipping-address", "PATCH", values);
  const { data, error } = await requireSupabase().auth.updateUser({ data: { shipping_address: values } });
  if (error) throw error;
  const saved = normalizeShippingAddress(data.user?.user_metadata?.shipping_address);
  if (!saved) throw new ApiError("failed");
  return saved;
}
export async function getMyProfile(): Promise<CustomerProfile> {
  if (isLocalTestMode) return localTestRequest("/profile");
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user) throw new ApiError("signin");
  const meta = data.user.user_metadata;
  return { name: String(meta.name || ""), email: data.user.email || "", company: String(meta.company || ""), phone: String(meta.phone || ""), avatarUrl: await profileAvatarUrl(data.user.id, meta.avatar_path) };
}
export async function saveMyProfile(profile: Omit<CustomerProfile, "email">, avatar?: File): Promise<void> {
  const values = { name: profile.name.trim(), company: profile.company.trim(), phone: profile.phone.trim() };
  if (!values.name || values.name.length > 120 || values.company.length > 160 || values.phone.length > 50) throw new ApiError("invalid");
  const extension = avatar ? await validateAvatarFile(avatar) : null;
  if (isLocalTestMode) {
    const avatarUrl = avatar ? (await localTestRequest<{ url: string }>("/avatar", "POST", avatar)).url : undefined;
    await localTestRequest("/profile", "PATCH", { ...values, ...(avatarUrl ? { avatarUrl } : {}) }); return;
  }
  const client = requireSupabase();
  let newPath: string | undefined;
  let oldPath: unknown;
  if (avatar) {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new ApiError("signin");
    oldPath = data.user.user_metadata?.avatar_path;
    newPath = `${data.user.id}/${createUuid()}.${extension}`;
    try {
      const { error: uploadError } = await client.storage.from("customer-avatars").upload(newPath, avatar, { contentType: avatar.type, upsert: false });
      if (uploadError) throw new ApiError(/bucket.*not found/i.test(uploadError.message) ? "avatarStorageUnavailable" : "avatarUploadFailed");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError("avatarUploadFailed");
    }
  }
  try {
    const { error } = await client.auth.updateUser({ data: { ...values, ...(newPath ? { avatar_path: newPath } : {}) } });
    if (error) throw error;
  } catch (error) {
    if (newPath) await client.storage.from("customer-avatars").remove([newPath]).catch(() => undefined);
    throw error;
  }
  // Delete only after metadata is saved; failed saves keep the previous avatar intact.
  if (newPath && typeof oldPath === "string" && oldPath.startsWith(newPath.split("/")[0] + "/")) {
    await client.storage.from("customer-avatars").remove([oldPath]).catch(() => undefined);
  }
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
    client.from("redemption_requests").select("*").eq("customer_id", user.id).order("updated_at", { ascending: false }).limit(50),
    client.from("notification_reads").select("notification_id").eq("customer_id", user.id),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return { transactions: results[0].data || [], orders: results[1].data || [], gifts: results[2].data || [], readIds: (results[3].data || []).map(row => row.notification_id) };
}
export async function markMyNotificationsRead(ids: string[]): Promise<string[]> {
  if (isLocalTestMode) return localTestRequest("/notification-reads", "PATCH", { ids: ids.slice(-300) });
  const { data, error } = await requireSupabase().rpc("mark_notifications_read", { p_ids: ids.slice(-300) });
  if (error) giftRpcError(error);
  return data || [];
}


export async function replyGiftRequest(id: string, reply: string): Promise<void> {
  reply = reply.trim();
  if (!reply || reply.length > 2000) throw new ApiError("invalid");
  if (isLocalTestMode) { await localTestRequest(`/redemptions/${encodeURIComponent(id)}/reply`, "PATCH", { reply }); return; }
  const { error } = await requireSupabase().rpc("reply_gift_request", { p_id: id, p_reply: reply });
  if (error) giftRpcError(error);
}
export async function listContactMessages(page: number, forReview: boolean): Promise<ContactMessageRow[]> {
  if (!Number.isInteger(page) || page < 0) throw new ApiError("invalid");
  if (isLocalTestMode) return localTestRequest(`/contact-messages?page=${page}&review=${forReview ? 1 : 0}`);
  const user = await getCurrentUser();
  if (!user) throw new ApiError("signin");
  if (forReview && user.role !== "admin") throw new ApiError("forbidden");
  let query = requireSupabase().from("contact_messages").select("*").order("created_at", { ascending: false }).order("id", { ascending: false });
  if (!forReview) query = query.eq("customer_id", user.id);
  const { data, error } = await query.range(page * 20, page * 20 + 19);
  if (error) throw error;
  return data || [];
}
export async function submitContactMessage(body: string, operationId: string): Promise<void> {
  body = body.trim();
  if (!body || body.length > 2000) throw new ApiError("invalid");
  if (isLocalTestMode) { await localTestRequest("/contact-messages", "POST", { body, operationId }); return; }
  const { error } = await requireSupabase().rpc("submit_contact_message", { p_body: body, p_operation_id: operationId });
  if (error) giftRpcError(error);
}
export async function replyContactMessage(id: string, reply: string): Promise<void> {
  reply = reply.trim();
  if (!reply || reply.length > 2000) throw new ApiError("invalid");
  if (isLocalTestMode) { await localTestRequest(`/contact-messages/${encodeURIComponent(id)}`, "PATCH", { reply }); return; }
  const { error } = await requireSupabase().rpc("reply_contact_message", { p_id: id, p_reply: reply });
  if (error) giftRpcError(error);
}
export async function deleteContactMessage(id: string): Promise<void> {
  if (isLocalTestMode) { await localTestRequest(`/contact-messages/${encodeURIComponent(id)}`, "DELETE"); return; }
  const { error } = await requireSupabase().rpc("delete_contact_message", { p_id: id });
  if (error) giftRpcError(error);
}
