import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Security from "@/components/UserProfile/Security";
import UserMetaCard from "@/components/UserProfile/UserMetaCard";
import { useTranslation } from "react-i18next";

export default function UserProfiles() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta
        title={t("userProfile.pageTitle")}
        description={t("userProfile.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("userProfile.title")} />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 lg:mb-7 dark:text-white/90">
          {t("userProfile.title")}
        </h3>
        <div className="space-y-6">
          <UserMetaCard />
          <Security />
        </div>
      </div>
    </>
  );
}
