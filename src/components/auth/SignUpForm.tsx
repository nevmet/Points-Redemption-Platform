import { signUpCustomer, apiErrorKey, isLocalTestMode } from "@/lib/api";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AuthInteractionHandler } from "./AnimatedAuthScene";
import EmailVerificationForm from "./EmailVerificationForm";
import { readPendingSignup, storePendingSignup, type PendingSignup } from "@/lib/pending-signup";

export default function SignUpForm({ onInteraction }: { onInteraction?: AuthInteractionHandler }) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState<PendingSignup | null>(() => isLocalTestMode ? null : readPendingSignup());
  const updatePending = (value: PendingSignup | null) => { storePendingSignup(value); setPending(value); };
  if (pending) return <div className="auth-form"><p className="mb-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">{t("emailVerification.stepTwo")}</p><EmailVerificationForm pending={pending} onPendingChange={updatePending} onInteraction={onInteraction} /><p className="auth-switch"><Link to="/signin">{t("signUp.signInLink")}</Link></p></div>;
  return <div className="auth-form">
    {isLocalTestMode && <p role="status" className="auth-feedback auth-feedback-error mb-4">{t("emailVerification.demoNotice")}</p>}
    {!isLocalTestMode && <p className="mb-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">{t("emailVerification.stepOne")}</p>}
    <div className="auth-form-heading"><h1 id="signup-title">{t("authExperience.join")}</h1><p>{t("signUp.subtitle")}</p></div>
    <form onFocusCapture={event => {
      if (event.target instanceof HTMLInputElement) onInteraction?.({ focus: event.target.name === "password" ? "password" : "text" });
    }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) onInteraction?.({ focus: "none" }); }} onChangeCapture={() => { setError(""); setSuccess(false); onInteraction?.({ status: "idle" }); }} onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      const form = event.currentTarget; const data = new FormData(form);
      setBusy(true); setError(""); setSuccess(false); onInteraction?.({ status: "idle" });
      try {
        const email = String(data.get("email")).trim();
        const result = await signUpCustomer((String(data.get("fname")) + " " + String(data.get("lname"))).trim(), email, String(data.get("password")));
        form.reset(); setShowPassword(false);
        if (result === "verificationRequired") { updatePending({ email, resendAt: Date.now() + 60000 }); onInteraction?.({ status: "idle", focus: "none", revealed: false }); }
        else if (isLocalTestMode && result === "registered") { setSuccess(true); onInteraction?.({ status: "success", focus: "none", revealed: false }); }
        else { setError("emailVerification.verificationDisabled"); onInteraction?.({ status: "error" }); }
      } catch (failure) { setError(apiErrorKey(failure)); onInteraction?.({ status: "error" }); }
      finally { setBusy(false); }
    }}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="auth-field">
            <Label htmlFor="fname">{t("signUp.firstName")}</Label>
            <Input id="fname" name="fname" autoComplete="given-name" required maxLength={50} disabled={busy} placeholder={t("signUp.firstNamePlaceholder")} />
          </div>
          <div className="auth-field">
            <Label htmlFor="lname">{t("signUp.lastName")}</Label>
            <Input id="lname" name="lname" autoComplete="family-name" required maxLength={50} disabled={busy} placeholder={t("signUp.lastNamePlaceholder")} />
          </div>
        </div>
        <div className="auth-field">
          <Label htmlFor="email">{t("signUp.email")}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={busy} placeholder={t("signUp.emailPlaceholder")} />
        </div>
        <div className="auth-field">
          <Label htmlFor="signup-password">{t("signUp.password")}</Label>
          <div className="relative">
            <Input id="signup-password" name="password" autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} placeholder={t("signUp.passwordPlaceholder")} type={showPassword ? "text" : "password"} className="pe-12" />
            <button type="button" disabled={busy} aria-label={t(showPassword ? "authExperience.hidePassword" : "authExperience.showPassword")} aria-pressed={showPassword} aria-controls="signup-password" onClick={() => { setShowPassword(!showPassword); onInteraction?.({ revealed: !showPassword }); }} className="auth-password-toggle">
            {showPassword ? <EyeIcon className="size-5 fill-current" /> : <EyeCloseIcon className="size-5 fill-current" />}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="auth-feedback auth-feedback-error">{t(error)}</p>}
        {success && <p role="status" className="auth-feedback auth-feedback-success">{t(isLocalTestMode ? "customerManager.registered" : "customerManager.checkEmail")}</p>}
        <Button type="submit" disabled={busy} className="auth-submit w-full">{t(busy ? "adminOrderPoints.saving" : isLocalTestMode ? "signUp.signUpButton" : "emailVerification.send")}</Button>
      </div>
    </form>
    <p className="auth-switch">{t("signUp.alreadyHaveAccount")} <Link to="/signin">{t("signUp.signInLink")}</Link></p>
  </div>;
}
