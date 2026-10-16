import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { apiErrorKey, resendSignupEmail, verifySignupEmail } from "@/lib/api";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { AuthInteractionHandler } from "./AnimatedAuthScene";
import type { PendingSignup } from "@/lib/pending-signup";

export default function EmailVerificationForm({ pending, onPendingChange, onInteraction }: {
  pending: PendingSignup;
  onPendingChange: (value: PendingSignup | null) => void;
  onInteraction?: AuthInteractionHandler;
}) {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [now, setNow] = useState(Date.now);
  const remaining = Math.max(0, Math.ceil((pending.resendAt - now) / 1000));
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const enter = async () => { await refreshUser(); onPendingChange(null); navigate("/", { replace: true }); };
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (failure) { setError(apiErrorKey(failure)); onInteraction?.({ status: "error" }); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div>
    <div className="auth-form-heading"><h1>{t(verified ? "emailVerification.verified" : "emailVerification.title")}</h1><p>{t("emailVerification.sentTo", { email: pending.email })}</p></div>
    {verified ? <><p role="status" className="auth-feedback auth-feedback-success mb-5">{t("emailVerification.completed")}</p><Button type="button" disabled={busy} className="auth-submit w-full" onClick={() => void run(enter)}>{t("emailVerification.continue")}</Button></> : <>
      <p className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{t("emailVerification.instructions")}</p>
      <form onSubmit={event => { event.preventDefault(); void run(async () => {
        await verifySignupEmail(pending.email, token);
        setVerified(true); setToken(""); onInteraction?.({ status: "success", focus: "none" });
      }); }}>
        <div className="auth-field mb-6"><Label htmlFor="signup-code">{t("emailVerification.code")}</Label><Input id="signup-code" name="code" autoFocus inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" minLength={6} maxLength={10} value={token} disabled={busy} onChange={event => { setToken(event.target.value.replace(/\D/g, "")); setError(""); onInteraction?.({ status: "idle" }); }} /></div>
        <Button type="submit" className="auth-submit w-full" disabled={busy}>{t(busy ? "emailVerification.working" : "emailVerification.verify")}</Button>
      </form>
      <div className="mt-5 flex flex-wrap justify-between gap-4 text-sm text-gray-600 dark:text-gray-300">
        <button type="button" disabled={busy || remaining > 0} className="underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void run(async () => {
          // Start the local cooldown even on failure; the server also enforces rate limits.
          onPendingChange({ ...pending, resendAt: Date.now() + 60000 }); setNow(Date.now());
          await resendSignupEmail(pending.email); setNotice("emailVerification.resent"); setToken("");
        })}>{remaining > 0 ? t("emailVerification.resendAfter", { seconds: remaining }) : t("emailVerification.resend")}</button>
        <button type="button" disabled={busy} className="underline underline-offset-4 disabled:opacity-50" onClick={() => { onPendingChange(null); onInteraction?.({ status: "idle" }); }}>{t("emailVerification.changeEmail")}</button>
      </div>
    </>}
    {error && <p role="alert" className="auth-feedback auth-feedback-error mt-5">{t(error)}</p>}
    {notice && <p role="status" className="auth-feedback auth-feedback-success mt-5">{t(notice)}</p>}
  </div>;
}
