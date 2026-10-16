import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import BrandLogo from "@/components/common/BrandLogo";
import LanguageSelect from "@/components/common/LanguageSelect";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import AnimatedAuthScene, { type AuthInteraction, type AuthInteractionHandler } from "@/components/auth/AnimatedAuthScene";
import { ChevronLeftIcon } from "@/icons";

export default function AuthLayout({ children, showBackLink = true }: { children: (onInteraction: AuthInteractionHandler) => ReactNode; showBackLink?: boolean }) {
  const { t } = useTranslation();
  const [interaction, setInteraction] = useState<AuthInteraction>({ focus: "none", revealed: false, status: "idle" });
  const onInteraction = useCallback<AuthInteractionHandler>(change => setInteraction(previous => ({ ...previous, ...change })), []);
  return <div className="auth-page">
    <aside className="auth-art-panel">
      <a href="https://www.bags-star.com" className="relative z-10 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"><BrandLogo /></a>
      <div className="auth-art-content">
        <AnimatedAuthScene interaction={interaction} />
        <div className="auth-art-caption">
          <h2>{t("authExperience.headline")}</h2>
        </div>
      </div>
      <p className="auth-company-name">{t("authExperience.company")}</p>
    </aside>
    <main className="auth-form-panel">
      <header className="auth-toolbar">
        {showBackLink && <Link to="/" className="inline-flex items-center gap-1 rounded-md text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <ChevronLeftIcon className="size-4 rtl:rotate-180" />{t("signIn.backToDashboard")}
        </Link>}
        <div className="ms-auto"><LanguageSelect /></div>
      </header>
      <div className="auth-form-content">
        <a href="https://www.bags-star.com" className="auth-form-brand" aria-label={t("brand.name")}><BrandLogo size="sm" /></a>
        {children(onInteraction)}
      </div>
      <footer className="auth-form-footer"><span>{t("authExperience.footer")}</span><ThemeTogglerTwo /></footer>
    </main>
  </div>;
}
