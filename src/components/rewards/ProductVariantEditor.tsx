import { createUuid } from "@/lib/uuid";
import { useTranslation } from "react-i18next";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { MAX_PRODUCT_VARIANTS, MAX_VARIANT_FIELDS } from "@/lib/product-variants";

export type VariantDraft = { id: string; values: string[]; points: string };
export default function ProductVariantEditor({ fields, onFieldsChange, value, onChange, disabled }: { fields: string[]; onFieldsChange: (fields: string[]) => void; value: VariantDraft[]; onChange: (value: VariantDraft[]) => void; disabled: boolean }) {
  const { t } = useTranslation();
  const update = (id: string, change: Partial<VariantDraft>) => onChange(value.map((row) => row.id === id ? { ...row, ...change } : row));
  return <fieldset disabled={disabled} className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
    <legend className="px-2 text-sm font-semibold text-gray-900 dark:text-white">{t("productVariants.title")}</legend>
    <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{t("productSpecifications.bilingualHint")}</p>
    <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">{t("productVariants.fieldsHint")}</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field, index) => <div key={index}>
      <Label htmlFor={`variant-field-${index}`}>{t("productVariants.fieldLabel", { number: index + 1 })}</Label>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1"><Input id={`variant-field-${index}`} required maxLength={30} value={field} onChange={(event) => onFieldsChange(fields.map((entry, i) => i === index ? event.target.value : entry))} /></div>
        <button type="button" disabled={disabled || fields.length === 1} aria-label={t("productVariants.removeField", { number: index + 1 })} onClick={() => { onFieldsChange(fields.filter((_, i) => i !== index)); onChange(value.map((row) => ({ ...row, values: row.values.filter((_, i) => i !== index) }))); }} className="h-11 shrink-0 rounded-lg border border-error-200 bg-error-50 px-3 text-sm font-medium text-error-600 hover:bg-error-100 focus-visible:outline-2 focus-visible:outline-error-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20">{t("productVariants.deleteField")}</button>
      </div>
    </div>)}</div>
    {fields.length === 1 && <p className="text-xs text-gray-500 dark:text-gray-400">{t("productVariants.minimumField")}</p>}
    <Button type="button" variant="outline" disabled={disabled || fields.length >= MAX_VARIANT_FIELDS} onClick={() => { onFieldsChange([...fields, ""]); onChange(value.map((row) => ({ ...row, values: [...row.values, ""] }))); }}>{t("productVariants.addField")}</Button>
    <p className="border-t border-gray-200 pt-4 text-xs leading-5 text-gray-500 dark:border-gray-700 dark:text-gray-400">{t("productVariants.combinationsHint")}</p>
    {value.map((row, index) => <div key={row.id} className="grid gap-3 rounded-lg bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:bg-gray-800">
      {fields.map((field, fieldIndex) => <div key={fieldIndex}><Label htmlFor={`variant-${row.id}-${fieldIndex}`}>{field || t("productVariants.fieldLabel", { number: fieldIndex + 1 })}</Label><Input id={`variant-${row.id}-${fieldIndex}`} required maxLength={60} value={row.values[fieldIndex] || ""} onChange={(event) => update(row.id, { values: row.values.map((entry, i) => i === fieldIndex ? event.target.value : entry) })} /></div>)}
      <div><Label htmlFor={`variant-points-${row.id}`}>{t("catalogEditor.points")}</Label><Input id={`variant-points-${row.id}`} required inputMode="numeric" maxLength={10} value={row.points} onChange={(event) => update(row.id, { points: event.target.value })} /></div>
      <button type="button" onClick={() => onChange(value.filter((entry) => entry.id !== row.id))} className="justify-self-start text-sm text-error-600 dark:text-error-400">{t("productVariants.remove", { number: index + 1 })}</button>
    </div>)}
    <Button type="button" variant="outline" disabled={disabled || value.length >= MAX_PRODUCT_VARIANTS} onClick={() => onChange([...value, { id: createUuid(), values: fields.map(() => ""), points: "" }])}>{t("productVariants.addCombination")}</Button>
  </fieldset>;
}
