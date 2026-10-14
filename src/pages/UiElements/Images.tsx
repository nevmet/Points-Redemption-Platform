import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ResponsiveImage from "../../components/ui/images/ResponsiveImage";
import TwoColumnImageGrid from "../../components/ui/images/TwoColumnImageGrid";
import ThreeColumnImageGrid from "../../components/ui/images/ThreeColumnImageGrid";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function Images() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta
        title={t("images.pageTitle")}
        description={t("images.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("images.title")} />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title={t("images.responsiveImage")}>
          <ResponsiveImage />
        </ComponentCard>
        <ComponentCard title={t("images.twoColumnGrid")}>
          <TwoColumnImageGrid />
        </ComponentCard>
        <ComponentCard title={t("images.threeColumnGrid")}>
          <ThreeColumnImageGrid />
        </ComponentCard>
      </div>
    </>
  );
}
