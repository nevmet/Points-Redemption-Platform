import { useTranslation } from "react-i18next";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { ProductOption } from "@/lib/database";
import { MAX_PRODUCT_OPTIONS, MAX_OPTION_VALUES } from "@/lib/product-options";

export default function ProductOptionEditor({ value, onChange, disabled }: { value: ProductOption[]; onChange: (options: ProductOption[]) => void; disabled: boolean }) {
  const { t } = useTranslation();
  const update = (id: string, change: Partial<ProductOption>) => onChange(value.map((option) => option.id === id ? { ...option, ...change } : option));
  const removeClass = "shrink-0 rounded-lg border border-error-200 px-3 py-2 text-sm text-error-600 disabled:opacity-40 dark:border-error-500/30 dark:text-error-400";
  return <fieldset disabled={disabled} className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
    <legend className="px-2 text-sm font-semibold text-gray-900 dark:text-white">{t("productOptions.title")}</legend>
    <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{t("productSpecifications.bilingualHint")}</p>
    <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">{t("productOptions.hint")}</p>
    {value.map((option, index) => <div key={option.id} className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
      <Label htmlFor={`option-name-${option.id}`}>{t("productOptions.name", { number: index + 1 })}</Label>
      <div className="flex gap-2"><div className="min-w-0 flex-1"><Input id={`option-name-${option.id}`} required maxLength={30} value={option.name} onChange={(event) => update(option.id, { name: event.target.value })} /></div><button type="button" className={removeClass} onClick={() => onChange(value.filter((row) => row.id !== option.id))}>{t("productOptions.remove")}</button></div>
      <div className="grid gap-3 sm:grid-cols-2">{option.values.map((entry, valueIndex) => <div key={valueIndex}>
        <Label htmlFor={`option-${option.id}-${valueIndex}`}>{t("productOptions.value", { number: valueIndex + 1 })}</Label>
        <div className="flex gap-2"><div className="min-w-0 flex-1"><Input id={`option-${option.id}-${valueIndex}`} required maxLength={60} value={entry} onChange={(event) => update(option.id, { values: option.values.map((text, i) => i === valueIndex ? event.target.value : text) })} /></div><button type="button" disabled={option.values.length === 1} aria-label={t("productOptions.removeValue", { name: option.name, number: valueIndex + 1 })} className={removeClass} onClick={() => update(option.id, { values: option.values.filter((_, i) => i !== valueIndex) })}>{t("productVariants.deleteField")}</button></div>
      </div>)}</div>
      <Button variant="outline" type="button" disabled={disabled || option.values.length >= MAX_OPTION_VALUES} onClick={() => update(option.id, { values: [...option.values, ""] })}>{t("productOptions.addValue")}</Button>
    </div>)}
    <Button variant="outline" type="button" disabled={disabled || value.length >= MAX_PRODUCT_OPTIONS} onClick={() => onChange([...value, { id: crypto.randomUUID(), name: value.length ? "" : t("productOptions.color"), values: [""] }])}>{t("productOptions.add")}</Button>
  </fieldset>;
}
