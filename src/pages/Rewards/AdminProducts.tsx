import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/common/PageMeta";
import Button from "@/components/ui/button/Button";
import ProductEditor from "@/components/rewards/ProductEditor";
import useRemoteData from "@/hooks/useRemoteData";
import { apiErrorKey, listProducts, setProductStatus, deleteDraftProduct } from "@/lib/api";
import type { ProductRow, ProductStatus } from "@/lib/database";
import { productText } from "@/lib/product-display";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";

export default function AdminProducts() {
  const { t } = useTranslation();
  const { data, error, refresh } = useRemoteData(listProducts);
  const [editing, setEditing] = useState<ProductRow | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const { isOpen, openModal, closeModal } = useModal();
  const visibleProducts = data?.filter((product) => (statusFilter === "all" || product.status === statusFilter) && productText(product, "name", t).toLowerCase().includes(search.trim().toLowerCase())) || [];
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(deleting.id); setDeleteError("");
    try {
      await deleteDraftProduct(deleting.id);
      if (editing?.id === deleting.id) setEditing(undefined);
      closeModal(); setDeleting(null); refresh(); setNotice("adminProducts.deleted");
    } catch (failure) { setDeleteError(apiErrorKey(failure)); }
    finally { setBusy(""); }
  };
  const toggle = async (product: ProductRow) => {
    if (busy) return; setBusy(product.id); setNotice("");
    try { await setProductStatus(product.id, product.status === "published" ? "draft" : "published"); if (editing?.id === product.id) setEditing(undefined); refresh(); setNotice("adminProducts.saved"); }
    catch (failure) { setNotice(apiErrorKey(failure)); }
    finally { setBusy(""); }
  };
  return <div className="space-y-6">
    <PageMeta title={t("adminProducts.pageTitle")} description={t("adminProducts.description")} />
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">{t("adminProducts.title")}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("adminProducts.description")}</p></div><Button onClick={() => { setEditing(null); setNotice(""); }}>{t("adminProducts.addReward")}</Button></div>
    {notice && <p role="status" className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">{t(notice)}</p>}
    {editing !== undefined && <ProductEditor key={editing?.id || "new"} product={editing} onSaved={() => { setEditing(undefined); setNotice("adminProducts.saved"); refresh(); }} onCancel={() => setEditing(undefined)} />}
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">{t("adminProducts.allRewards")}</h2><input aria-label={t("adminProducts.searchPlaceholder")} placeholder={t("adminProducts.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white" /></div>
      <div role="group" aria-label={t("adminProducts.statusFilter")} className="flex flex-wrap gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">{(["all", "published", "draft"] as const).map((status) => <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-4 py-2 text-sm font-medium ${statusFilter === status ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"}`}>{t(status === "all" ? "adminProducts.allRewards" : status === "published" ? "adminProducts.statusPublished" : "adminProducts.statusDraft")} <span className="ms-1">{data ? data.filter((product) => status === "all" || product.status === status).length : "—"}</span></button>)}</div>
      {error ? <p role="alert" className="p-5 text-error-600 dark:text-error-400">{t(error)}</p> : !data ? <p role="status" className="p-5 text-gray-500 dark:text-gray-400">{t("pointsExchange.loading")}</p> : <div className="divide-y divide-gray-100 dark:divide-gray-800">{visibleProducts.length === 0 && <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("adminProducts.noMatches")}</p>}{visibleProducts.map((product) => <article key={product.id} className="flex flex-wrap items-center gap-4 p-5">
        <img src={product.image_url || "/images/product/product-01.jpg"} alt="" className="h-14 w-16 rounded-lg object-cover" />
        <div className="min-w-0 flex-1"><h3 className="break-words font-semibold text-gray-900 dark:text-white">{productText(product, "name", t)}</h3><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{product.category} · {product.variants?.length ? t("productVariants.fromPoints", { points: product.points.toLocaleString() }) : `${product.points.toLocaleString()} ${t("rewards.pointsShort")}`}</p></div>
        <span className="text-sm text-gray-600 dark:text-gray-300">{t(product.status === "published" ? "adminProducts.statusPublished" : "adminProducts.statusDraft")}</span>
        <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => void toggle(product)}>{t(product.status === "published" ? "adminProducts.unpublish" : "adminProducts.publish")}</Button>
        <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => { setEditing(product); setNotice(""); }}>{t("catalogEditor.edit")}</Button>
        {product.status === "draft" && <button type="button" disabled={Boolean(busy)} onClick={() => { setDeleting(product); setDeleteError(""); openModal(); }} className="rounded-lg px-4 py-3 text-sm font-medium text-error-600 ring-1 ring-inset ring-error-200 hover:bg-error-50 disabled:opacity-50 dark:text-error-400 dark:ring-error-500/30 dark:hover:bg-error-500/10">{t("adminProducts.delete")}</button>}
      </article>)}</div>}
    </section>
    <Modal isOpen={isOpen} onClose={() => { if (!busy) closeModal(); }} showCloseButton={false} className="mx-4 max-w-md p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="delete-product-title" aria-describedby="delete-product-description">
        <h2 id="delete-product-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t("adminProducts.deleteTitle")}</h2>
        <p id="delete-product-description" className="mt-3 break-words text-sm leading-6 text-gray-600 dark:text-gray-300">{t("adminProducts.deleteConfirm", { name: deleting ? productText(deleting, "name", t) : "" })}</p>
        {deleteError && <p role="alert" className="mt-3 text-sm text-error-600 dark:text-error-400">{t(deleteError)}</p>}
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={Boolean(busy)} onClick={closeModal}>{t("rewards.cancel")}</Button><button type="button" disabled={Boolean(busy)} onClick={() => void remove()} className="rounded-lg bg-error-600 px-4 py-3 text-sm font-medium text-white hover:bg-error-700 disabled:opacity-50 dark:bg-error-500 dark:hover:bg-error-600">{t(busy ? "adminProducts.deleting" : "adminProducts.confirmDelete")}</button></div>
      </div>
    </Modal>
  </div>;
}
