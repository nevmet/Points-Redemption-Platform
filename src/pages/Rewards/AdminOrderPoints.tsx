import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/common/PageMeta";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import OrderPointRequestCard from "@/components/rewards/OrderPointRequestCard";
import OrderPointsReviewForm from "@/components/rewards/OrderPointsReviewForm";
import useOrderPointRequests from "@/hooks/useOrderPointRequests";
import type { OrderPointRequestRow } from "@/lib/database";
import useRemoteData from "@/hooks/useRemoteData";
import { listAdminCustomers } from "@/lib/api";
import { groupOrderRequests } from "@/lib/order-request-groups";
import OrderReviewCustomerList from "@/components/rewards/OrderReviewCustomerList";

export default function AdminOrderPoints() {
  const { t } = useTranslation();
  const { feed, refresh, upsert } = useOrderPointRequests(true);
  const customers = useRemoteData(listAdminCustomers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [notice, setNotice] = useState<OrderPointRequestRow | null>(null);
  const groups = groupOrderRequests(customers.data || [], feed.requests);
  const selected = groups.find((group) => group.id === selectedId);
  const visible = selected?.requests.filter((request) => filter === "all" || request.status === filter) || [];
  const ready = feed.status === "ready" && customers.data !== null && !customers.error;
  return (
    <div className="space-y-6">
      <PageMeta title={t("adminOrderPoints.pageTitle")} description={t("adminOrderPoints.description")} />
      <PageBreadCrumb pageTitle={t("adminOrderPoints.title")} />
      <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">{t("adminOrderPoints.description")}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selectedId !== null && <Button variant="outline" size="sm" onClick={() => { setSelectedId(null); setNotice(null); }}>{t("adminOrderPoints.backToCustomers")}</Button>}
        <Button variant="outline" size="sm" disabled={feed.status === "loading" || customers.refreshing} onClick={() => { setNotice(null); refresh(); customers.refresh(); }}>{t("pointsExchange.refresh")}</Button>
      </div>
      {customers.error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(customers.error)}</p>}
      {notice && <p role="status" className="break-words rounded-xl bg-success-50 p-4 text-sm text-success-800 dark:bg-success-500/10 dark:text-success-300">{t(notice.status === "approved" ? "adminOrderPoints.awarded" : "adminOrderPoints.rejected", { order: notice.order_number, points: notice.awarded_points })}</p>}
      {!ready ? <p role="status" className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">{t(feed.status === "error" ? `pointsExchange.errors.${feed.error}` : customers.error ? "adminOrderPoints.loadFailed" : "pointsExchange.loading")}</p> : selectedId === null ? (
        <OrderReviewCustomerList groups={groups} search={search} onSearch={setSearch} onSelect={(group) => { setSelectedId(group.id); setFilter(group.pending > 0 ? "pending" : "all"); setNotice(null); }} />
      ) : selected ? <section className="space-y-5" aria-labelledby="selected-order-customer">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><h2 id="selected-order-customer" className="break-words text-lg font-semibold text-gray-900 dark:text-white">{t("adminOrderPoints.customerRequests", { name: selected.username })}</h2><p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">{selected.email}</p></div>
        <div role="group" aria-label={t("adminOrderPoints.statusFilter")} className="flex flex-wrap gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((status) => <button type="button" key={status} aria-pressed={filter === status} onClick={() => { setFilter(status); setNotice(null); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${filter === status ? "bg-brand-500 text-white dark:bg-brand-500" : "bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700"}`}>{t(`pointsExchange.status.${status}`)} ({status === "all" ? selected.requests.length : selected[status]})</button>)}
        </div>
      {visible.length > 0 ? (
        <div className="grid items-start gap-5 lg:grid-cols-2">{visible.map((request) => (
          <OrderPointRequestCard key={request.id} request={request} showCustomer>
            {request.status === "pending" && <OrderPointsReviewForm request={request} onReviewed={(updated) => { upsert(updated); setNotice(updated); }} />}
          </OrderPointRequestCard>
        ))}</div>
      ) : (
        <div role="status" className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/3 dark:text-gray-400">{t("adminOrderPoints.empty")}</div>
      )}
      </section> : <p role="status" className="text-gray-500 dark:text-gray-400">{t("adminOrderPoints.noCustomers")}</p>}
    </div>
  );
}
