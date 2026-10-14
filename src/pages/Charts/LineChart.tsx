import LineChartOne from "@/components/charts/line/LineChartOne";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function LineChart() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta
        title={t("lineChart.pageTitle")}
        description={t("lineChart.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("lineChart.title")} />
      <div className="space-y-6">
        <ComponentCard title={t("lineChart.chartOne")}>
          <LineChartOne />
        </ComponentCard>
      </div>
    </>
  );
}
