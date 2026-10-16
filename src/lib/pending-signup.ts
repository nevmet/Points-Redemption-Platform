export type PendingSignup = { email: string; resendAt: number };
const storageKey = "bags-star-pending-signup";

export function readPendingSignup(): PendingSignup | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    return value && typeof value.email === "string" && value.email.length <= 254 && typeof value.resendAt === "number" && Number.isFinite(value.resendAt) ? { email: value.email, resendAt: value.resendAt } : null;
  } catch { return null; }
}

export function storePendingSignup(value: PendingSignup | null) {
  // Keep only the pending email and cooldown across refreshes, never the password/code.
  try { if (value) sessionStorage.setItem(storageKey, JSON.stringify({ email: value.email, resendAt: value.resendAt })); else sessionStorage.removeItem(storageKey); } catch { /* Storage may be disabled. */ }
}
