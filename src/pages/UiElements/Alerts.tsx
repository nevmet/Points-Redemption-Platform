import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { useTranslation } from "react-i18next";

export default function Alerts() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta
        title={t("alerts.pageTitle")}
        description={t("alerts.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("alerts.title")} />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title={t("alerts.successAlert")}>
          <Alert
            variant="success"
            title={t("alerts.successMessage")}
            message={t("alerts.cautionMessage")}
            showLink={true}
            linkHref="/"
            linkText={t("alerts.learnMore")}
          />
          <Alert
            variant="success"
            title={t("alerts.successMessage")}
            message={t("alerts.cautionMessage")}
            showLink={false}
          />
        </ComponentCard>
        <ComponentCard title={t("alerts.warningAlert")}>
          <Alert
            variant="warning"
            title={t("alerts.warningMessage")}
            message={t("alerts.cautionMessage")}
            showLink={true}
            linkHref="/"
            linkText={t("alerts.learnMore")}
          />
          <Alert
            variant="warning"
            title={t("alerts.warningMessage")}
            message={t("alerts.cautionMessage")}
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title={t("alerts.errorAlert")}>
          <Alert
            variant="error"
            title={t("alerts.errorMessage")}
            message={t("alerts.cautionMessage")}
            showLink={true}
            linkHref="/"
            linkText={t("alerts.learnMore")}
          />
          <Alert
            variant="error"
            title={t("alerts.errorMessage")}
            message={t("alerts.cautionMessage")}
            showLink={false}
          />
        </ComponentCard>{" "}
        <ComponentCard title={t("alerts.infoAlert")}>
          <Alert
            variant="info"
            title={t("alerts.infoMessage")}
            message={t("alerts.cautionMessage")}
            showLink={true}
            linkHref="/"
            linkText={t("alerts.learnMore")}
          />
          <Alert
            variant="info"
            title={t("alerts.infoMessage")}
            message={t("alerts.cautionMessage")}
            showLink={false}
          />
        </ComponentCard>
      </div>
    </>
  );
}
