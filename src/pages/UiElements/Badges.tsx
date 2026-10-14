import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Badge from "@/components/ui/badge/Badge";
import { PlusIcon } from "@/icons";
import { useTranslation } from "react-i18next";

export default function Badges() {
  const { t } = useTranslation();
  return (
    <div>
      <PageMeta
        title={t("badges.pageTitle")}
        description={t("badges.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("badges.title")} />

      <div className="space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("badges.withLightBackground")}
            </h3>
          </div>

          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {/* Light Variant */}
              <Badge variant="light" color="primary">
                {t("badges.labels.primary")}
              </Badge>
              <Badge variant="light" color="success">
                {t("badges.labels.success")}
              </Badge>{" "}
              <Badge variant="light" color="error">
                {t("badges.labels.error")}
              </Badge>{" "}
              <Badge variant="light" color="warning">
                {t("badges.labels.warning")}
              </Badge>{" "}
              <Badge variant="light" color="info">
                {t("badges.labels.info")}
              </Badge>
              <Badge variant="light" color="light">
                {t("badges.labels.light")}
              </Badge>
              <Badge variant="light" color="dark">
                {t("badges.labels.dark")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("badges.withSolidBackground")}
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              {/* Light Variant */}
              <Badge variant="solid" color="primary">
                {t("badges.labels.primary")}
              </Badge>
              <Badge variant="solid" color="success">
                {t("badges.labels.success")}
              </Badge>{" "}
              <Badge variant="solid" color="error">
                {t("badges.labels.error")}
              </Badge>{" "}
              <Badge variant="solid" color="warning">
                {t("badges.labels.warning")}
              </Badge>{" "}
              <Badge variant="solid" color="info">
                {t("badges.labels.info")}
              </Badge>
              <Badge variant="solid" color="light">
                {t("badges.labels.light")}
              </Badge>
              <Badge variant="solid" color="dark">
                {t("badges.labels.dark")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("badges.lightWithLeadingIcon")}
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="light" color="primary" startIcon={<PlusIcon />}>
                {t("badges.labels.primary")}
              </Badge>
              <Badge variant="light" color="success" startIcon={<PlusIcon />}>
                {t("badges.labels.success")}
              </Badge>{" "}
              <Badge variant="light" color="error" startIcon={<PlusIcon />}>
                {t("badges.labels.error")}
              </Badge>{" "}
              <Badge variant="light" color="warning" startIcon={<PlusIcon />}>
                {t("badges.labels.warning")}
              </Badge>{" "}
              <Badge variant="light" color="info" startIcon={<PlusIcon />}>
                {t("badges.labels.info")}
              </Badge>
              <Badge variant="light" color="light" startIcon={<PlusIcon />}>
                {t("badges.labels.light")}
              </Badge>
              <Badge variant="light" color="dark" startIcon={<PlusIcon />}>
                {t("badges.labels.dark")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("badges.solidWithTrailingIcon")}
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="solid" color="primary" startIcon={<PlusIcon />}>
                {t("badges.labels.primary")}
              </Badge>
              <Badge variant="solid" color="success" startIcon={<PlusIcon />}>
                {t("badges.labels.success")}
              </Badge>{" "}
              <Badge variant="solid" color="error" startIcon={<PlusIcon />}>
                {t("badges.labels.error")}
              </Badge>{" "}
              <Badge variant="solid" color="warning" startIcon={<PlusIcon />}>
                {t("badges.labels.warning")}
              </Badge>{" "}
              <Badge variant="solid" color="info" startIcon={<PlusIcon />}>
                {t("badges.labels.info")}
              </Badge>
              <Badge variant="solid" color="light" startIcon={<PlusIcon />}>
                {t("badges.labels.light")}
              </Badge>
              <Badge variant="solid" color="dark" startIcon={<PlusIcon />}>
                {t("badges.labels.dark")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("badges.lightWithLeadingIcon")}
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="light" color="primary" endIcon={<PlusIcon />}>
                {t("badges.labels.primary")}
              </Badge>
              <Badge variant="light" color="success" endIcon={<PlusIcon />}>
                {t("badges.labels.success")}
              </Badge>{" "}
              <Badge variant="light" color="error" endIcon={<PlusIcon />}>
                {t("badges.labels.error")}
              </Badge>{" "}
              <Badge variant="light" color="warning" endIcon={<PlusIcon />}>
                {t("badges.labels.warning")}
              </Badge>{" "}
              <Badge variant="light" color="info" endIcon={<PlusIcon />}>
                {t("badges.labels.info")}
              </Badge>
              <Badge variant="light" color="light" endIcon={<PlusIcon />}>
                {t("badges.labels.light")}
              </Badge>
              <Badge variant="light" color="dark" endIcon={<PlusIcon />}>
                {t("badges.labels.dark")}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <div className="px-6 py-5">
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              {t("badges.solidWithTrailingIcon")}
            </h3>
          </div>
          <div className="border-t border-gray-100 p-6 xl:p-10 dark:border-gray-800">
            <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
              <Badge variant="solid" color="primary" endIcon={<PlusIcon />}>
                {t("badges.labels.primary")}
              </Badge>
              <Badge variant="solid" color="success" endIcon={<PlusIcon />}>
                {t("badges.labels.success")}
              </Badge>{" "}
              <Badge variant="solid" color="error" endIcon={<PlusIcon />}>
                {t("badges.labels.error")}
              </Badge>{" "}
              <Badge variant="solid" color="warning" endIcon={<PlusIcon />}>
                {t("badges.labels.warning")}
              </Badge>{" "}
              <Badge variant="solid" color="info" endIcon={<PlusIcon />}>
                {t("badges.labels.info")}
              </Badge>
              <Badge variant="solid" color="light" endIcon={<PlusIcon />}>
                {t("badges.labels.light")}
              </Badge>
              <Badge variant="solid" color="dark" endIcon={<PlusIcon />}>
                {t("badges.labels.dark")}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
