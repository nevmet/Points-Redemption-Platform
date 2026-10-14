import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/common/PageMeta";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import CustomerPointsPanel from "@/components/rewards/CustomerPointsPanel";
import useRemoteData from "@/hooks/useRemoteData";
import { listAdminCustomers } from "@/lib/api";

export default function AdminCustomers() {
  const { t, i18n } = useTranslation();
  const { data, error, refresh } = useRemoteData(listAdminCustomers);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState("");
  const selected = data?.find((customer) => customer.id === selectedId);
  const visible = data?.filter((customer) => (customer.username + " " + customer.email).toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="space-y-6">
    <PageMeta title={t("customerManager.pageTitle")} description={t("customerManager.description")} />
    <PageBreadCrumb pageTitle={t("customerManager.title")} />
    <p className="text-sm text-gray-600 dark:text-gray-400">{t("customerManager.description")}</p>
    <div className="flex flex-wrap items-center justify-between gap-3"><input aria-label={t("customerManager.search")} placeholder={t("customerManager.search")} value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 min-w-0 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" /><Button variant="outline" onClick={refresh}>{t("pointsExchange.refresh")}</Button></div>
    {notice && <p role="status" className="rounded-xl bg-success-50 p-4 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">{notice}</p>}
    {error && <p role="alert" className="text-error-600 dark:text-error-400">{t(error)}</p>}
    {data && <p className="text-sm text-gray-500 dark:text-gray-400">{t("customerManager.count", { count: data.length })}</p>}
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <section className="space-y-3" aria-label={t("customerManager.title")}>
        {!data ? <p role="status" className="text-gray-500 dark:text-gray-400">{t("pointsExchange.loading")}</p> : !visible?.length ? <p className="text-gray-500 dark:text-gray-400">{t("customerManager.empty")}</p> : visible.map((customer) => <article key={customer.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="break-words font-semibold text-gray-900 dark:text-white">{customer.username}</h2><p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400">{customer.email}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("customerManager.registeredAt")}: {customer.created_at ? new Date(customer.created_at).toLocaleString(i18n.language) : t("customerManager.testAccount")}</p>
          <dl className="my-4 grid grid-cols-3 gap-2">{(["balance", "total_credit", "total_debit"] as const).map((key) => <div key={key}><dt className="text-xs text-gray-500 dark:text-gray-400">{t("customerManager." + key)}</dt><dd className="mt-1 break-all font-semibold text-gray-900 dark:text-white">{customer[key].toLocaleString()}</dd></div>)}</dl>
          <Button variant={selectedId === customer.id ? "primary" : "outline"} size="sm" onClick={() => { setSelectedId(customer.id); setNotice(""); }}>{t("customerManager.manage")}</Button>
        </article>)}
      </section>
      {selected && <CustomerPointsPanel key={selected.id} customer={selected} onAdjusted={(row) => { setNotice(t("customerManager.saved", { name: selected.username, points: row.balance_after?.toLocaleString() })); refresh(); }} />}
    </div>
  </div>;
}
