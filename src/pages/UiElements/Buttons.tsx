import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Button from "@/components/ui/button/Button";
import { BoxIcon } from "@/icons";
import { useTranslation } from "react-i18next";

export default function Buttons() {
  const { t } = useTranslation();
  return (
    <div>
      <PageMeta
        title={t("buttons.pageTitle")}
        description={t("buttons.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("buttons.title")} />
      <div className="space-y-5 sm:space-y-6">
        {/* Primary Button */}
        <ComponentCard title={t("buttons.primaryButton")}>
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">
              {t("buttons.buttonText")}
            </Button>
            <Button size="md" variant="primary">
              {t("buttons.buttonText")}
            </Button>
          </div>
        </ComponentCard>
        {/* Primary Button with Start Icon */}
        <ComponentCard title={t("buttons.primaryLeadingIcon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="primary"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
            <Button
              size="md"
              variant="primary"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
          </div>
        </ComponentCard>
        {/* Primary Button with Start Icon */}
        <ComponentCard title={t("buttons.primaryTrailingIcon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="primary"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
            <Button
              size="md"
              variant="primary"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
          </div>
        </ComponentCard>
        {/* Outline Button */}
        <ComponentCard title={t("buttons.secondaryButton")}>
          <div className="flex items-center gap-5">
            {/* Outline Button */}
            <Button size="sm" variant="outline">
              {t("buttons.buttonText")}
            </Button>
            <Button size="md" variant="outline">
              {t("buttons.buttonText")}
            </Button>
          </div>
        </ComponentCard>
        {/* Outline Button with Start Icon */}
        <ComponentCard title={t("buttons.outlineLeadingIcon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="outline"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
            <Button
              size="md"
              variant="outline"
              startIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
          </div>
        </ComponentCard>{" "}
        {/* Outline Button with Start Icon */}
        <ComponentCard title={t("buttons.outlineTrailingIcon")}>
          <div className="flex items-center gap-5">
            <Button
              size="sm"
              variant="outline"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
            <Button
              size="md"
              variant="outline"
              endIcon={<BoxIcon className="size-5" />}
            >
              {t("buttons.buttonText")}
            </Button>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
