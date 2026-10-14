import { useTranslation } from "react-i18next";
import Button from "@/components/ui/button/Button";
import { ClockIcon } from "@/icons";
import type useOrderPointRequests from "@/hooks/useOrderPointRequests";
import OrderPointRequestCard from "./OrderPointRequestCard";
import OrderPointRequestEditor from "./OrderPointRequestEditor";

type Props = Pick<ReturnType<typeof useOrderPointRequests>, "feed" | "refresh" | "upsert">;

export default function OrderPointsHistory({ feed, refresh, upsert }: Props) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="points-history-title" className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div>
          <h2 id="points-history-title" className="font-semibold text-gray-900 dark:text-white">{t("pointsExchange.historyTitle")}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{t("pointsExchange.historyDescription")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={feed.status === "loading"}>{t("pointsExchange.refresh")}</Button>
      </div>
      {feed.status === "ready" && feed.requests.length > 0 ? (
        <div className="grid gap-4 p-5 md:grid-cols-2">{feed.requests.map((request) => <OrderPointRequestCard key={request.id} request={request}><OrderPointRequestEditor request={request} onSaved={upsert} /></OrderPointRequestCard>)}</div>
      ) : (
        <div role="status" className="flex flex-col items-center px-6 py-8 text-center">
          <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500"><ClockIcon className="size-5" aria-hidden="true" /></span>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t(feed.status === "loading" ? "pointsExchange.loading" : feed.status === "error" ? `pointsExchange.errors.${feed.error}` : "pointsExchange.historyEmpty")}</p>
          <p className="mt-1 max-w-lg text-xs leading-5 text-gray-500 dark:text-gray-400">{t("pointsExchange.historyHint")}</p>
        </div>
      )}
    </section>
  );
}
