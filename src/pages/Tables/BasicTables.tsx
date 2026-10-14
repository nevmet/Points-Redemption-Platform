import { useTranslation } from "react-i18next";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import BasicTableOne from "@/components/tables/BasicTables/BasicTableOne";

export default function BasicTables() {
  const { t } = useTranslation();

  return (
    <>
      <PageMeta
        title={t("basicTables.pageTitle")}
        description={t("basicTables.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("basicTables.title")} />
      <div className="space-y-6">
        <ComponentCard title={t("basicTables.tableOne")}>
          <BasicTableOne />
        </ComponentCard>
      </div>
    </>
  );
}
