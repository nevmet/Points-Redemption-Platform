import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { apiErrorKey, getProduct, redeemGift } from "@/lib/api";
import type { ProductRow } from "@/lib/database";
import { productText } from "@/lib/product-display";
import { specificationTerm, variantText } from "@/lib/product-specification-display";

const initialOptions = (product: ProductRow): Record<string, string> => Object.fromEntries((product.options || []).map((option) => [option.id, option.values[0] || ""]));

export default function ProductRedemptionDialog({ product, onClose, onRedeemed }: { product: ProductRow; onClose: () => void; onRedeemed: () => void }) {
  const { t, i18n } = useTranslation();
  const { isOpen } = useModal(true);
  const [current, setCurrent] = useState(product);
  const [variantId, setVariantId] = useState("");
  const [optionValues, setOptionValues] = useState<Record<string, string>>(() => initialOptions(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const variants = current.variants || [];
  const selected = variants.find((variant) => variant.id === variantId);
  const points = variants.length ? selected?.points : current.points;
  const options = current.options || [];
  const optionsComplete = options.every((option) => option.values.includes(optionValues[option.id]));
  const submit = async () => {
    if (busy || points === undefined || !optionsComplete) return;
    setBusy(true); setError("");
    try { await redeemGift(current.id, selected?.id, points, options.map((option) => ({ optionId: option.id, value: optionValues[option.id] }))); onRedeemed(); }
    catch (failure) { setError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  const reload = async () => {
    setBusy(true);
    try { const updated = await getProduct(product.id); setCurrent(updated); setVariantId(""); setOptionValues(initialOptions(updated)); setError(""); }
    catch (failure) { setError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => { if (!busy) onClose(); }} showCloseButton={false} className="mx-4 max-h-[90svh] max-w-lg overflow-y-auto p-6">
    <div role="dialog" aria-modal="true" aria-labelledby="redeem-product-title">
      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">{t("rewards.requestTitle")}</p>
      <h2 id="redeem-product-title" className="mt-2 break-words text-xl font-semibold text-gray-900 dark:text-white">{productText(current, "name", t)}</h2>
      {variants.length > 0 && <fieldset disabled={busy} className="mt-5 space-y-2"><legend className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t("productVariants.choose")}</legend>{variants.map((variant) => <label key={variant.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${variant.id === variantId ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-700"}`}>
        <input type="radio" name="redemption-variant" value={variant.id} checked={variantId === variant.id} onChange={() => { setVariantId(variant.id); setError(""); }} className="size-4 shrink-0 accent-brand-500" />
        <span className="min-w-0 flex-1 break-words text-gray-900 dark:text-white">{variantText(variant, t, i18n.language)}</span><span className="shrink-0 font-semibold text-brand-600 dark:text-brand-400">{variant.points.toLocaleString(i18n.language)} {t("rewards.pointsShort")}</span>
      </label>)}</fieldset>}
      {options.length > 0 && <fieldset disabled={busy} className="mt-5 space-y-4"><legend className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">{t("productOptions.choose")}</legend>{options.map((option) => <div key={option.id}>
        <label htmlFor={`redeem-option-${option.id}`} className="mb-2 block text-sm text-gray-700 dark:text-gray-300">{specificationTerm(option.name, t, i18n.language)}</label>
        <select id={`redeem-option-${option.id}`} value={optionValues[option.id] || ""} onChange={(event) => { setOptionValues({ ...optionValues, [option.id]: event.target.value }); setError(""); }} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">{option.values.map((value) => <option key={value} value={value}>{specificationTerm(value, t, i18n.language)}</option>)}</select>
      </div>)}<p className="text-xs text-gray-500 dark:text-gray-400">{t("productOptions.noExtraPoints")}</p></fieldset>}
      <div className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-gray-800"><p className="text-sm text-gray-500 dark:text-gray-400">{t("productVariants.total")}</p><p aria-live="polite" className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{points === undefined ? t("productVariants.chooseFirst") : `${points.toLocaleString(i18n.language)} ${t("rewards.pointsShort")}`}</p>{selected && <p className="mt-2 break-words text-sm text-gray-600 dark:text-gray-300">{variantText(selected, t, i18n.language)}</p>}<p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{t("rewards.representativeContact")}</p></div>
      {error && <div className="mt-3"><p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(error)}</p><button type="button" disabled={busy} onClick={() => void reload()} className="mt-2 text-sm text-brand-600 dark:text-brand-400">{t("productVariants.reload")}</button></div>}
      <div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>{t("rewards.cancel")}</Button><Button disabled={busy || points === undefined || !optionsComplete} onClick={() => void submit()}>{t(busy ? "adminOrderPoints.saving" : "rewards.submitRequest")}</Button></div>
    </div>
  </Modal>;
}
