import { useTranslation } from "react-i18next";
import Button from "@/components/ui/button/Button";
import type { OrderRequestGroup } from "@/lib/order-request-groups";

export default function OrderReviewCustomerList({ groups, search, onSearch, onSelect }: {
  groups: OrderRequestGroup[]; search: string; onSearch: (value: string) => void; onSelect: (group: OrderRequestGroup) => void;
}) {
  const { t } = useTranslation();
  const visible = groups.filter((group) => `${group.username} ${group.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section aria-labelledby="order-review-customers" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="order-review-customers" className="text-lg font-semibold text-gray-900 dark:text-white">{t("adminOrderPoints.customers")}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("adminOrderPoints.customerSummary", { count: groups.length, pending: groups.reduce((sum, group) => sum + group.pending, 0) })}</p></div>
      <input aria-label={t("customerManager.search")} placeholder={t("customerManager.search")} value={search} onChange={(event) => onSearch(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 sm:w-72 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
    </div>
    {!visible.length && <p role="status" className="rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">{t("adminOrderPoints.noCustomers")}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((group) => <article key={group.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="break-words font-semibold text-gray-900 dark:text-white">{group.username}</h3>
        <p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">{group.email}</p>
        <dl className="my-5 grid grid-cols-3 gap-2">{(["pending", "approved", "rejected"] as const).map((status) => <div key={status}>
          <dt className="text-xs text-gray-500 dark:text-gray-400">{t(`pointsExchange.status.${status}`)}</dt>
          <dd className={`mt-1 text-xl font-semibold ${status === "pending" && group.pending > 0 ? "text-warning-600 dark:text-warning-400" : "text-gray-900 dark:text-white"}`}>{group[status]}</dd>
        </div>)}</dl>
        <Button size="sm" variant="outline" onClick={() => onSelect(group)}>{t("adminOrderPoints.viewCustomer", { count: group.requests.length })}</Button>
      </article>)}
    </div>
  </section>;
}
