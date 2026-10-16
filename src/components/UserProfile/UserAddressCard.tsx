import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "@/hooks/useRemoteData";
import { apiErrorKey, getMyShippingAddress, saveMyShippingAddress } from "@/lib/api";
import { addressLimits, emptyShippingAddress, requiredAddressFields, type ShippingAddress } from "@/lib/shipping-address";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

const autocomplete: Record<keyof ShippingAddress, string> = {
  recipient: "shipping name", phone: "shipping tel", country: "shipping country-name",
  region: "shipping address-level1", city: "shipping address-level2", postalCode: "shipping postal-code",
  line1: "shipping address-line1", line2: "shipping address-line2",
};
const loadAddress = async () => ({ address: await getMyShippingAddress() });

export default function UserAddressCard() {
  const { user } = useAuth();
  return <AddressEditor key={user?.id} />;
}

function AddressEditor() {
  const { t } = useTranslation();
  const { data, error, refresh } = useRemoteData(loadAddress);
  const [saved, setSaved] = useState<ShippingAddress | null>(null);
  const [draft, setDraft] = useState<ShippingAddress | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [success, setSuccess] = useState(false);
  const address = saved || data?.address;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true); setFailure(""); setSuccess(false);
    try {
      setSaved(await saveMyShippingAddress(draft));
      setDraft(null); setSuccess(true);
    } catch (cause) { setFailure(apiErrorKey(cause)); }
    finally { setBusy(false); }
  }
  return <section id="shipping-address" aria-labelledby="shipping-address-title" className="scroll-mt-24 rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
    <h2 id="shipping-address-title" className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{t("shippingAddress.title")}</h2>
    <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{t("shippingAddress.description")}</p>
    {error && <p role="alert" className="mb-4 text-sm text-error-600 dark:text-error-400">{t(error)} <button type="button" onClick={refresh} className="underline">{t("pointsExchange.refresh")}</button></p>}
    {failure && <p role="alert" className="mb-4 text-sm text-error-600 dark:text-error-400">{t(failure)}</p>}
    {success && <p role="status" className="mb-4 text-sm text-success-600 dark:text-success-400">{t("shippingAddress.saved")}</p>}
    {!data && !error && <p role="status" className="text-sm text-gray-500">{t("pointsExchange.loading")}</p>}
    {data && (draft ? <form onSubmit={submit} className="space-y-5">
      <p className="text-xs text-gray-500 dark:text-gray-400">{t("shippingAddress.requiredHint")}</p>
      <div className="grid gap-5 sm:grid-cols-2">{(Object.keys(addressLimits) as (keyof ShippingAddress)[]).map(field => <div key={field} className={field === "line1" || field === "line2" ? "sm:col-span-2" : ""}>
        <Label htmlFor={`shipping-${field}`}>{t(`shippingAddress.${field}`)}{requiredAddressFields.includes(field) && <span aria-hidden="true"> *</span>}</Label>
        <Input id={`shipping-${field}`} name={field} type={field === "phone" ? "tel" : "text"} autoComplete={autocomplete[field]} required={requiredAddressFields.includes(field)} maxLength={addressLimits[field]} value={draft[field]} disabled={busy} onChange={event => setDraft({ ...draft, [field]: event.target.value })} />
      </div>)}</div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>{t(busy ? "adminOrderPoints.saving" : "catalogEditor.saveChanges")}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(null); setFailure(""); }}>{t("rewards.cancel")}</Button>
      </div>
    </form> : <>
      {address ? <dl className="mb-5 grid gap-5 sm:grid-cols-2">{(Object.keys(addressLimits) as (keyof ShippingAddress)[]).filter(field => address[field]).map(field => <div key={field} className={field === "line1" || field === "line2" ? "sm:col-span-2" : ""}>
        <dt className="mb-1 text-sm text-gray-500 dark:text-gray-400">{t(`shippingAddress.${field}`)}</dt>
        <dd className="break-words text-sm text-gray-900 dark:text-white">{address[field]}</dd>
      </div>)}</dl> : <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{t("shippingAddress.empty")}</p>}
      <Button type="button" variant="outline" onClick={() => { setDraft({ ...(address || emptyShippingAddress) }); setFailure(""); setSuccess(false); }}>{t(address ? "shippingAddress.edit" : "shippingAddress.add")}</Button>
    </>)}
  </section>;
}
