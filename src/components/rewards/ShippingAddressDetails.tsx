import { useTranslation } from "react-i18next";
import { addressLimits, type ShippingAddress } from "@/lib/shipping-address";

export default function ShippingAddressDetails({ address }: { address: ShippingAddress }) {
  const { t } = useTranslation();
  return <dl className="mt-3 grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 dark:bg-gray-800">
    {(Object.keys(addressLimits) as (keyof ShippingAddress)[]).filter(field => address[field]).map(field => <div key={field}>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{t(`shippingAddress.${field}`)}</dt>
      <dd className="mt-1 select-text break-words text-sm text-gray-900 dark:text-white">{address[field]}</dd>
    </div>)}
  </dl>;
}
