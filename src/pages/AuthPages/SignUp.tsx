import SignUpForm from "@/components/auth/SignUpForm";
import LanguageSelect from "@/components/common/LanguageSelect";
import PageMeta from "@/components/common/PageMeta";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ChevronLeftIcon } from "@/icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export default function SignUp() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta
        title={t("signUp.pageTitle")}
        description={t("signUp.pageDescription")}
      />
      <div className="relative isolate min-h-svh bg-gray-100 dark:bg-gray-950">
        <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
          <img
            src="/images/company/bags-star-factory.jpg"
            alt=""
            width={1920}
            height={800}
            fetchPriority="high"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gray-950/25 dark:bg-gray-950/55" />
        </div>

        <header className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 p-4 sm:px-8 sm:py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-gray-950/30 px-3 py-2.5 text-sm text-white backdrop-blur-sm transition hover:bg-gray-950/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white dark:border-white/20 dark:bg-gray-950/50 dark:hover:bg-gray-950/70"
          >
            <ChevronLeftIcon className="size-5 shrink-0 rtl:rotate-180" />
            {t("signUp.backToDashboard")}
          </Link>
          <LanguageSelect />
        </header>

        <main className="flex min-h-svh items-center justify-center px-4 py-32 sm:px-6 sm:py-28">
          <section
            aria-labelledby="signup-title"
            className="w-full max-w-lg rounded-3xl border border-white/70 bg-white/95 p-6 shadow-theme-xl backdrop-blur-md sm:p-8 dark:border-gray-700/70 dark:bg-gray-900/95"
          >
            <SignUpForm />
          </section>
        </main>

        <div className="fixed end-6 bottom-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </>
  );
}
