import { createUuid } from "@/lib/uuid";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { apiErrorKey, createProduct, updateProduct, uploadProductImage, listProductCategories } from "@/lib/api";
import useRemoteData from "@/hooks/useRemoteData";
import { MAX_PRODUCT_IMAGES, productImages } from "@/lib/product-image";
import ProductOptionEditor from "./ProductOptionEditor";
import { validateProductOptions } from "@/lib/product-options";
import type { ProductOption, ProductRow } from "@/lib/database";
import ProductVariantEditor, { type VariantDraft } from "./ProductVariantEditor";
import { validateProductVariants } from "@/lib/product-variants";

export default function ProductEditor({ product, onSaved, onCancel }: { product: ProductRow | null; onSaved: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const { data: categories, error: categoryError } = useRemoteData(listProductCategories);
  const [points, setPoints] = useState(String(product?.points || ""));
  const [multipleVariants, setMultipleVariants] = useState(Boolean(product?.variants?.length));
  const [fields, setFields] = useState<string[]>(() => product?.variants?.length ? product.variants[0].attributes?.map((item) => item.name) || [t("productVariants.legacyField")] : [t("productVariants.series"), t("productVariants.memory")]);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>(() => (product?.variants || []).map((variant) => ({ id: variant.id, values: variant.attributes?.map((item) => item.value) || [variant.name], points: String(variant.points) })));
  const [options, setOptions] = useState<ProductOption[]>(product?.options || []);
  const [description, setDescription] = useState(product?.description || "");
  const [images, setImages] = useState<string[]>(product ? productImages(product) : []);
  const [uploading, setUploading] = useState(false);
  const status = product?.status || "draft";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (files: File[]) => {
    if (!files.length || uploading || busy) return;
    if (images.length + files.length > MAX_PRODUCT_IMAGES) { setError("catalogEditor.imageCount"); return; }
    setUploading(true); setError("");
    try {
      for (const file of files) {
        const url = await uploadProductImage(file);
        setImages((current) => [...current, url]);
      }
    } catch (failure) { setError(apiErrorKey(failure)); }
    finally { setUploading(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || uploading) return;
    if (!categories?.some((entry) => entry.name === category)) { setError("categoryManager.categoryInvalid"); return; }
    if (!name.trim() || (!multipleVariants && (!/^\d+$/.test(points) || Number(points) < 1 || Number(points) > 2147483647))) { setError("testAuth.errors.invalid"); return; }
    let variants;
    try {
      if (multipleVariants && (!variantDrafts.length || variantDrafts.some((row) => !/^\d+$/.test(row.points)))) throw new Error();
      variants = validateProductVariants(multipleVariants ? variantDrafts.map((row) => ({ id: row.id, attributes: fields.map((field, index) => ({ name: field, value: row.values[index] || "" })), points: Number(row.points) })) : []);
    } catch { setError("productVariants.variantInvalid"); return; }
    let savedOptions;
    try { savedOptions = validateProductOptions(options); }
    catch { setError("productOptions.optionInvalid"); return; }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const savedStatus = submitter instanceof HTMLButtonElement && submitter.value === "published" ? "published" : submitter instanceof HTMLButtonElement && submitter.value === "draft" ? "draft" : status;
    setBusy(true); setError("");
    const input = { name: name.trim(), category, points: variants.length ? Math.min(...variants.map((variant) => variant.points)) : Number(points), variants, options: savedOptions, description, image_url: images[0] || null, image_urls: images, status: savedStatus };
    try { if (product) await updateProduct(product.id, input); else await createProduct(input); onSaved(); }
    catch (failure) { setError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-brand-200 bg-white p-6 dark:border-brand-500/30 dark:bg-gray-900">
    <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">{t(product ? "catalogEditor.edit" : "adminProducts.addReward")}</h2>
    <form onSubmit={submit} onInvalid={() => setError("productVariants.requiredFields")} className="grid gap-4 sm:grid-cols-2">
      <div className="sticky top-20 z-9 space-y-3 rounded-xl border border-brand-200 bg-white p-4 shadow-theme-sm sm:col-span-2 dark:border-brand-500/30 dark:bg-gray-900">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("productVariants.saveHint")}</p>
        {error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(error)}</p>}
        <div className="flex flex-wrap gap-3">
          {product && <Button type="submit" value="keep" disabled={busy || uploading}>{t(busy ? "adminOrderPoints.saving" : "catalogEditor.saveChanges")}</Button>}
          <Button type="submit" value="published" variant={product ? "outline" : "primary"} disabled={busy || uploading}>{t(busy ? "adminOrderPoints.saving" : "productVariants.savePublished")}</Button>
          <Button type="submit" value="draft" variant="outline" disabled={busy || uploading}>{t("productVariants.saveDraft")}</Button>
          <Button type="button" variant="outline" disabled={busy || uploading} onClick={onCancel}>{t("rewards.cancel")}</Button>
        </div>
      </div>
      <div><Label htmlFor="product-name">{t("catalogEditor.name")}</Label><Input id="product-name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} /></div>
      {!multipleVariants && <div><Label htmlFor="product-points">{t("catalogEditor.points")}</Label><Input id="product-points" required inputMode="numeric" maxLength={10} value={points} onChange={(e) => setPoints(e.target.value)} /></div>}
      <div><Label htmlFor="product-category">{t("catalogEditor.category")}</Label><select id="product-category" required disabled={!categories} value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"><option value="">{t("categoryManager.choose")}</option>{categories?.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select>{categoryError && <p role="alert" className="mt-2 text-sm text-error-600 dark:text-error-400">{t(categoryError)}</p>}</div>
      <div><Label>{t("catalogEditor.status")}</Label><p className="py-2 text-sm text-gray-700 dark:text-gray-300">{t(status === "published" ? "adminProducts.statusPublished" : "adminProducts.statusDraft")}</p></div>
      <div className="space-y-3 sm:col-span-2">
        <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300"><input type="checkbox" checked={multipleVariants} disabled={busy || uploading} onChange={(event) => { setMultipleVariants(event.target.checked); if (event.target.checked && !variantDrafts.length) setVariantDrafts([{ id: createUuid(), values: fields.map(() => ""), points }]); }} className="size-4 accent-brand-500" />{t("productVariants.enable")}</label>
        {multipleVariants && <ProductVariantEditor fields={fields} onFieldsChange={setFields} value={variantDrafts} onChange={setVariantDrafts} disabled={busy || uploading} />}
      </div>
      <div className="sm:col-span-2"><ProductOptionEditor value={options} onChange={setOptions} disabled={busy || uploading} /></div>
      <div className="sm:col-span-2">
        <Label htmlFor="product-image">{t("catalogEditor.image")}</Label>
        <input id="product-image" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={busy || uploading || images.length >= MAX_PRODUCT_IMAGES} onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; void upload(files); }} className="block w-full rounded-xl border border-dashed border-brand-300 bg-brand-50 p-4 text-sm text-gray-700 file:me-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-white disabled:opacity-50 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-gray-300" />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("catalogEditor.imageHint")}</p>
        <p role="status" className="mt-2 text-sm text-brand-600 dark:text-brand-400">{uploading ? t("catalogEditor.uploading") : images.length ? t("catalogEditor.imageReady", { count: images.length }) : ""}</p>
        {images.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((url, index) => <div key={url} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <img src={url} alt={t("catalogEditor.preview", { number: index + 1 })} className="aspect-square w-full bg-gray-50 object-contain dark:bg-gray-800" />
          <div className="flex flex-wrap gap-2 p-2">
            <button type="button" disabled={busy || uploading || index === 0} onClick={() => setImages([url, ...images.filter((_, i) => i !== index)])} className="rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-700 disabled:opacity-60 dark:bg-brand-500/10 dark:text-brand-300">{t(index === 0 ? "catalogEditor.cover" : "catalogEditor.setCover")}</button>
            <button type="button" disabled={busy || uploading} aria-label={t("catalogEditor.removeImage", { number: index + 1 })} onClick={() => setImages(images.filter((_, i) => i !== index))} className="rounded-md px-2 py-1 text-xs text-error-600 dark:text-error-400">{t("catalogEditor.remove")}</button>
          </div>
        </div>)}</div>}
      </div>
      <div className="sm:col-span-2"><Label htmlFor="product-description">{t("catalogEditor.description")}</Label><textarea id="product-description" rows={3} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" /></div>
      <div className="flex gap-3 sm:col-span-2"><Button type="submit" disabled={busy || uploading}>{t(busy ? "adminOrderPoints.saving" : product ? "catalogEditor.saveChanges" : "catalogEditor.save")}</Button><Button type="button" variant="outline" disabled={busy || uploading} onClick={onCancel}>{t("rewards.cancel")}</Button></div>
    </form>
  </section>;
}
