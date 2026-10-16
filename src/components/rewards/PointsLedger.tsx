import { pointDescription } from "@/lib/product-specification-display";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "@/hooks/useRemoteData";
import { listMyPointTransactions } from "@/lib/api";

export default function PointsLedger() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "credit" | "debit">("all");
  const load = useCallback(async () => (await listMyPointTransactions())
    .filter((row) => row.customer_id ? row.customer_id === user?.id : row.customer_email === user?.email)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)), [user?.id, user?.email]);
  const { data, error, refresh, refreshing } = useRemoteData(load, { pollIntervalMs: 5000, revalidateOnFocus: true });
  const visible = data?.filter((row) => filter === "all" || row.type === filter);
  const credit = data?.reduce((sum, row) => sum + (row.type === "credit" ? row.points : 0), 0);
  const debit = data?.reduce((sum, row) => sum + (row.type === "debit" ? row.points : 0), 0);

  return (
    <section id="points-ledger" aria-labelledby="points-ledger-title" className="scroll-mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        <div>
          <h2 id="points-ledger-title" className="font-semibold text-gray-900 dark:text-white">{t("pointsLedger.title")}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{t("pointsLedger.description")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>{t(refreshing ? "rewards.pointsSyncing" : "pointsExchange.refresh")}</Button>
      </div>
      <div className="p-5">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([
            ["balance", credit === undefined || debit === undefined ? undefined : credit - debit],
            ["totalCredit", credit], ["totalDebit", debit],
          ] as const).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
              <dt className="text-xs text-gray-500 dark:text-gray-400">{t(`pointsLedger.${key}`)}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{value?.toLocaleString(i18n.language) ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <div aria-label={t("pointsLedger.filter")} role="group" className="mt-5 flex flex-wrap gap-2">
          {(["all", "credit", "debit"] as const).map((key) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === key ? "bg-brand-500 text-white dark:bg-brand-500" : "bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"}`}>{t(`pointsLedger.${key}`)}</button>)}
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-error-600 dark:text-error-400">{t("rewards.pointsSyncFailed")}</p>}
        {!data && !error && <p role="status" className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("pointsExchange.loading")}</p>}
        {visible?.length === 0 && <p role="status" className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("pointsLedger.empty")}</p>}
        {!!visible?.length && <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
          {visible.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t(row.refund_redemption_id ? "portalFixes.refundTitle" : row.order_point_request_id ? "pointsLedger.order" : row.operation_id ? "customerManager.manual" : row.type === "debit" ? "pointsLedger.redemption" : "pointsLedger.credit")}</p>
                {row.description && <p className="mt-1 break-words text-sm text-gray-600 dark:text-gray-300">{pointDescription(row, t, i18n.language)}</p>}
                <time dateTime={row.created_at} className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{new Date(row.created_at).toLocaleString(i18n.language)}</time>
              </div>
              <div className="text-end">
                <p className={`text-lg font-semibold tabular-nums ${row.type === "credit" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>{row.type === "credit" ? "+" : "−"}{row.points.toLocaleString(i18n.language)}</p>
                {row.balance_after != null && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("pointsLedger.balanceAfter", { points: row.balance_after.toLocaleString(i18n.language) })}</p>}
              </div>
            </li>
          ))}
        </ul>}
      </div>
    </section>
  );
}
