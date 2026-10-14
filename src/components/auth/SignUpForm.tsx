import { signUpCustomer, apiErrorKey, isLocalTestMode } from "@/lib/api";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export default function SignUpForm() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-md">
        <div>
          <div className="mb-6 text-center">
            <h1 id="signup-title" className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
              {t("signUp.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("signUp.subtitle")}
            </p>
          </div>
          <div>
            <form onSubmit={async (event) => {
              event.preventDefault(); if (busy) return;
              const form = event.currentTarget; const data = new FormData(form);
              setBusy(true); setError(""); setSuccess(false);
              try { await signUpCustomer((String(data.get("fname")) + " " + String(data.get("lname"))).trim(), String(data.get("email")).trim(), String(data.get("password"))); setSuccess(true); form.reset(); }
              catch (failure) { setError(apiErrorKey(failure)); }
              finally { setBusy(false); }
            }}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- First Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      {t("signUp.firstName")}<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname" required maxLength={50}
                      placeholder={t("signUp.firstNamePlaceholder")}
                    />
                  </div>
                  {/* <!-- Last Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      {t("signUp.lastName")}<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname" required maxLength={50}
                      placeholder={t("signUp.lastNamePlaceholder")}
                    />
                  </div>
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    {t("signUp.email")}<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email" required maxLength={254}
                    placeholder={t("signUp.emailPlaceholder")}
                  />
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    {t("signUp.password")}<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password" name="password" required minLength={8} maxLength={128}
                      placeholder={t("signUp.passwordPlaceholder")}
                      type={showPassword ? "text" : "password"}
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
                {/* <!-- Button --> */}
                <div>
                  <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600">
                    {t(busy ? "adminOrderPoints.saving" : "signUp.signUpButton")}
                  </button>
                </div>
              </div>
              {error && <p role="alert" className="mt-3 text-sm text-error-600 dark:text-error-400">{t(error)}</p>}
              {success && <p role="status" className="mt-3 text-sm text-success-700 dark:text-success-400">{t(isLocalTestMode ? "customerManager.registered" : "customerManager.checkEmail")}</p>}
            </form>

            <div className="mt-5">
              <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400">
                {t("signUp.alreadyHaveAccount")}{" "}
                <Link
                  to="/signin"
                  className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  {t("signUp.signInLink")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
