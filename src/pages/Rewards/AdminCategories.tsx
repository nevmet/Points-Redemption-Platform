import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import useRemoteData from "@/hooks/useRemoteData";
import { apiErrorKey, listProductCategories, listProducts, saveProductCategory, deleteProductCategory } from "@/lib/api";

const loadCategories = async () => {
  const [categories, products] = await Promise.all([listProductCategories(), listProducts()]);
  return { categories, products };
};

export default function AdminCategories() {
  const { t } = useTranslation();
  const { data, error, refresh } = useRemoteData(loadCategories);
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const reset = () => { setEditingId(undefined); setName(""); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setFailure(""); setNotice("");
    try { await saveProductCategory(name, editingId); reset(); refresh(); setNotice("categoryManager.saved"); }
    catch (reason) { setFailure(apiErrorKey(reason)); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (busy) return; setBusy(true); setFailure(""); setNotice("");
    try { await deleteProductCategory(id); if (editingId === id) reset(); refresh(); setNotice("categoryManager.deleted"); }
    catch (reason) { setFailure(apiErrorKey(reason)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <PageMeta title={t("categoryManager.pageTitle")} description={t("categoryManager.description")} />
    <PageBreadcrumb pageTitle={t("categoryManager.title")} />
    <p className="text-sm text-gray-500 dark:text-gray-400">{t("categoryManager.description")}</p>
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">{t(editingId ? "categoryManager.rename" : "categoryManager.add")}</h2>
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1"><Label htmlFor="category-name">{t("categoryManager.name")}</Label><Input id="category-name" required maxLength={80} disabled={busy} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <Button type="submit" disabled={busy || !data}>{t(busy ? "adminOrderPoints.saving" : "categoryManager.save")}</Button>
        {editingId && <Button type="button" variant="outline" disabled={busy} onClick={reset}>{t("rewards.cancel")}</Button>}
      </form>
    </section>
    {(failure || error) && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(failure || error)}</p>}
    {notice && <p role="status" className="text-sm text-success-600 dark:text-success-400">{t(notice)}</p>}
    {!data ? <p className="text-gray-500 dark:text-gray-400">{!error && t("pointsExchange.loading")}</p> : <section className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {data.categories.length === 0 && <p className="p-6 text-sm text-gray-500 dark:text-gray-400">{t("categoryManager.empty")}</p>}
      {data.categories.map((category) => {
        const count = data.products.filter((product) => product.category === category.name).length;
        return <article key={category.id} className="flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1"><h3 className="break-words font-semibold text-gray-900 dark:text-white">{category.name}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("categoryManager.products", { count })}</p>{count > 0 && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{t("categoryManager.usedHint")}</p>}</div>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => { setEditingId(category.id); setName(category.name); setFailure(""); setNotice(""); }}>{t("categoryManager.rename")}</Button>
          <Button variant="outline" size="sm" disabled={busy || count > 0} onClick={() => void remove(category.id)}>{t("categoryManager.delete")}</Button>
        </article>;
      })}
    </section>}
  </div>;
}
