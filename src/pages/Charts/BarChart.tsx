import BarChartOne from "@/components/charts/bar/BarChartOne";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function BarChart() {
  const { t } = useTranslation();
  return (
    <div>
      <PageMeta
        title={t("lineChart.pageTitle")}
        description={t("lineChart.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("barChart.title")} />
      <div className="space-y-6">
        <ComponentCard title={t("barChart.chartOne")}>
          <BarChartOne />
        </ComponentCard>
      </div>
    </div>
  );
}
