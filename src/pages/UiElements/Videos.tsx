import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FourIsToThree from "../../components/ui/videos/FourIsToThree";
import OneIsToOne from "../../components/ui/videos/OneIsToOne";
import SixteenIsToNine from "../../components/ui/videos/SixteenIsToNine";
import TwentyOneIsToNine from "../../components/ui/videos/TwentyOneIsToNine";
import { useTranslation } from "react-i18next";

export default function Videos() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta
        title={t("videos.pageTitle")}
        description={t("videos.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("videos.title")} />
      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2">
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title={t("videos.ratio169")}>
            <SixteenIsToNine />
          </ComponentCard>
          <ComponentCard title={t("videos.ratio43")}>
            <FourIsToThree />
          </ComponentCard>
        </div>
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title={t("videos.ratio219")}>
            <TwentyOneIsToNine />
          </ComponentCard>
          <ComponentCard title={t("videos.ratio11")}>
            <OneIsToOne />
          </ComponentCard>
        </div>
      </div>
    </>
  );
}
