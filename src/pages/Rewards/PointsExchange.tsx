import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import PageMeta from "@/components/common/PageMeta";
import OrderPointsForm from "@/components/rewards/OrderPointsForm";
import OrderPointsHistory from "@/components/rewards/OrderPointsHistory";
import PointsLedger from "@/components/rewards/PointsLedger";
import useOrderPointRequests from "@/hooks/useOrderPointRequests";
import { ArrowRightIcon, CheckCircleIcon, DocsIcon, ShootingStarIcon } from "@/icons";

const steps = [
  { key: "enter", icon: DocsIcon },
  { key: "verify", icon: CheckCircleIcon },
  { key: "claim", icon: ShootingStarIcon },
] as const;

export default function PointsExchange() {
  const { t } = useTranslation();
  const { feed, refresh, upsert } = useOrderPointRequests();

  return (
    <div className="space-y-6">
      <PageMeta title={t("pointsExchange.pageTitle")} description={t("pointsExchange.description")} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-600 dark:text-brand-400">{t("sidebar.customerPortal")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">{t("pointsExchange.title")}</h1>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">{t("pointsExchange.manualReview")}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{t("pointsExchange.description")}</p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
          {t("pointsExchange.browseGifts")}<ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <ol aria-label={t("pointsExchange.stepsLabel")} className="grid gap-4 rounded-2xl border border-brand-100 bg-brand-25 p-5 md:grid-cols-3 sm:p-6 dark:border-brand-500/20 dark:bg-brand-500/5">
        {steps.map(({ key, icon: Icon }, index) => (
          <li key={key} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-theme-xs dark:bg-gray-800 dark:text-brand-400"><Icon className="size-5" aria-hidden="true" /></span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100"><span className="me-2 text-brand-500 dark:text-brand-400">0{index + 1}</span>{t(`pointsExchange.steps.${key}.title`)}</h2>
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{t(`pointsExchange.steps.${key}.description`)}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2"><OrderPointsForm onSubmitted={upsert} /></div>
        <aside aria-labelledby="exchange-guide-title" className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 id="exchange-guide-title" className="font-semibold text-gray-900 dark:text-white">{t("pointsExchange.guideTitle")}</h2>
          <div className="mt-5 space-y-5">
            {["findOrder", "review", "gifts"].map((key) => (
              <div key={key}>
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">{t(`pointsExchange.guide.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">{t(`pointsExchange.guide.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <PointsLedger />
      <OrderPointsHistory feed={feed} refresh={refresh} upsert={upsert} />
    </div>
  );
}
