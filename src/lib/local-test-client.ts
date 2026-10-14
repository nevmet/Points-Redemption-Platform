import { isSupabaseConfigured } from "./supabase";
export const isLocalTestMode = import.meta.env.DEV && !isSupabaseConfigured && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
export class ApiError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export async function localTestRequest<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  if (!isLocalTestMode) throw new ApiError("unavailable");
  const binary = body instanceof Blob;
  const response = await fetch(`/api/local-test${path}`, { method, credentials: "same-origin", headers: body === undefined ? undefined : { "Content-Type": binary ? body.type : "application/json" }, body: body === undefined ? undefined : binary ? body : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error || "failed");
  return data as T;
}
