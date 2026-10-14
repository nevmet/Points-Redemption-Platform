import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { apiErrorKey, isLocalTestMode } from "@/lib/api";

export default function SignInForm() {
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
    setBusy(true); setError("");
    try { const account = await login(username.trim(), password, isChecked); navigate(account.role === "admin" ? "/admin/order-points" : "/", { replace: true }); }
    catch (failure) { setError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  if (user) return <Navigate to={user.role === "admin" ? "/admin/order-points" : "/"} replace />;
  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-md pt-10">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5 rtl:rotate-180" />
          {t("signIn.backToDashboard")}
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
              {t("signIn.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("signIn.subtitle")}
            </p>
          </div>
          <div>
            {isLocalTestMode && <p className="mb-5 rounded-lg bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{t("testAuth.localMode")}</p>}
            <form onSubmit={submit}>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="login-username">
                    {t("testAuth.username")} <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input id="login-username" name="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("testAuth.usernamePlaceholder")} />
                </div>
                <div>
                  <Label htmlFor="login-password">
                    {t("signIn.password")} <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder={t("signIn.passwordPlaceholder")}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-e-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={isChecked} onChange={setIsChecked} />
                    <span className="block text-theme-sm font-normal text-gray-700 dark:text-gray-400">
                      {t("signIn.keepMeLoggedIn")}
                    </span>
                  </div>
                </div>
                <div>
                  {error && <p role="alert" className="mb-3 text-sm text-error-600 dark:text-error-400">{t(error)}</p>}
                  <Button type="submit" disabled={busy} className="w-full" size="sm">
                    {t(busy ? "testAuth.signingIn" : "signIn.signInButton")}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
                {t("signIn.noAccount")}{" "}
                <Link
                  to="/signup"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  {t("signIn.signUpLink")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
