import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function Blank() {
  const { t } = useTranslation();
  return (
    <div>
      <PageMeta
        title={t("blank.pageTitle")}
        description={t("blank.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("blank.title")} />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 xl:px-10 xl:py-12 dark:border-gray-800 dark:bg-white/3">
        <div className="mx-auto w-full max-w-157.5 text-center">
          <h3 className="mb-4 text-theme-xl font-semibold text-gray-800 sm:text-2xl dark:text-white/90">
            {t("blank.cardTitle")}
          </h3>

          <p className="text-sm text-gray-500 sm:text-base dark:text-gray-400">
            {t("blank.description")}
          </p>
        </div>
      </div>
    </div>
  );
}
