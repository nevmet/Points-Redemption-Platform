import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import useRemoteData from "@/hooks/useRemoteData";
import { getCustomerShippingAddress } from "@/lib/api";
import { addressLimits, type ShippingAddress } from "@/lib/shipping-address";
import Button from "@/components/ui/button/Button";

export default function CustomerShippingAddress({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const load = useCallback(async () => ({ address: await getCustomerShippingAddress(customerId) }), [customerId]);
  const { data, error, refresh, refreshing } = useRemoteData(load, { revalidateOnFocus: true });
  return <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold text-gray-900 dark:text-white">{t("shippingAddress.title")}</h3>
      <Button type="button" size="sm" variant="outline" disabled={refreshing} onClick={refresh}>{t("pointsExchange.refresh")}</Button>
    </div>
    <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{t("shippingAddress.adminHint")}</p>
    {error ? <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(error)}</p>
      : !data ? <p role="status" className="text-sm text-gray-500">{t("pointsExchange.loading")}</p>
      : !data.address ? <p className="text-sm text-gray-500 dark:text-gray-400">{t("shippingAddress.customerEmpty")}</p>
      : <dl className="grid gap-4 sm:grid-cols-2">{(Object.keys(addressLimits) as (keyof ShippingAddress)[]).filter(field => data.address?.[field]).map(field => <div key={field} className={field === "line1" || field === "line2" ? "sm:col-span-2" : ""}>
        <dt className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t(`shippingAddress.${field}`)}</dt>
        <dd className="select-text break-words text-sm text-gray-900 dark:text-white">{data.address?.[field]}</dd>
      </div>)}</dl>}
  </section>;
}
