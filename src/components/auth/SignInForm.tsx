import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { apiErrorKey, isLocalTestMode } from "@/lib/api";
import type { AuthInteractionHandler } from "./AnimatedAuthScene";

export default function SignInForm({ onInteraction }: { onInteraction?: AuthInteractionHandler }) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); onInteraction?.({ status: "idle" });
    try {
      const account = await login(username.trim(), password, isChecked);
      navigate(account.role === "admin" ? "/admin/order-points" : "/", { replace: true });
    } catch (failure) { setError(apiErrorKey(failure)); onInteraction?.({ status: "error" }); }
    finally { setBusy(false); }
  };
  if (user) return <Navigate to={user.role === "admin" ? "/admin/order-points" : "/"} replace />;
  return <div className="auth-form">
    <div className="auth-form-heading"><h1>{t("authExperience.welcome")}</h1><p>{t("signIn.subtitle")}</p></div>
    {isLocalTestMode && <p className="mb-5 rounded-lg bg-brand-50 p-3 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{t("testAuth.localMode")}</p>}
    <form onSubmit={submit} onFocusCapture={event => {
      if (event.target instanceof HTMLInputElement) onInteraction?.({ focus: event.target.name === "password" ? "password" : "text" });
    }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) onInteraction?.({ focus: "none" }); }}>
      <div className="space-y-6">
        <div className="auth-field">
          <Label htmlFor="login-username">{t(isLocalTestMode ? "testAuth.username" : "signIn.email")}</Label>
          <Input id="login-username" name="username" type={isLocalTestMode ? "text" : "email"} autoComplete="username" required disabled={busy} value={username} onChange={event => { setUsername(event.target.value); setError(""); onInteraction?.({ status: "idle" }); }} placeholder={t(isLocalTestMode ? "testAuth.usernamePlaceholder" : "signUp.emailPlaceholder")} />
        </div>
        <div className="auth-field">
          <Label htmlFor="login-password">{t("signIn.password")}</Label>
          <div className="relative">
            <Input id="login-password" name="password" autoComplete="current-password" required disabled={busy} value={password} onChange={event => { setPassword(event.target.value); setError(""); onInteraction?.({ status: "idle" }); }} type={showPassword ? "text" : "password"} placeholder={t("signIn.passwordPlaceholder")} className="pe-12" />
            <button type="button" disabled={busy} aria-label={t(showPassword ? "authExperience.hidePassword" : "authExperience.showPassword")} aria-pressed={showPassword} aria-controls="login-password" onClick={() => { setShowPassword(!showPassword); onInteraction?.({ revealed: !showPassword }); }} className="auth-password-toggle">
              {showPassword ? <EyeIcon className="size-5 fill-current" /> : <EyeCloseIcon className="size-5 fill-current" />}
            </button>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
          <input type="checkbox" checked={isChecked} disabled={busy} onChange={event => setIsChecked(event.target.checked)} className="size-4 rounded accent-auth-accent" />{t("signIn.keepMeLoggedIn")}
        </label>
        {error && <p role="alert" className="auth-feedback auth-feedback-error">{t(error)}</p>}
        <Button type="submit" disabled={busy} className="auth-submit w-full">{t(busy ? "testAuth.signingIn" : "signIn.signInButton")}</Button>
      </div>
    </form>
    <p className="auth-switch">{t("signIn.noAccount")} <Link to="/signup">{t("signIn.signUpLink")}</Link></p>
  </div>;
}
