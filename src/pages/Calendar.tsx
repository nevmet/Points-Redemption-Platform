import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/palette.css";
import "@fullcalendar/react/themes/classic/theme.css";

export default function CalendarPage() {
  const { t } = useTranslation();
  return (
    <div>
      <PageMeta
        title={t("calendar.pageTitle")}
        description={t("calendar.pageDescription")}
      />
      <PageBreadcrumb pageTitle={t("calendar.title")} />
      <Calendar />
    </div>
  );
}
