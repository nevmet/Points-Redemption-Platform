import { pointDescription } from "@/lib/product-specification-display";
import { useCallback, useMemo, useState } from "react";
import ProductRedemptionDialog from "@/components/rewards/ProductRedemptionDialog";
import ProductGallery from "@/components/rewards/ProductGallery";
import { productImages } from "@/lib/product-image";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseLineIcon,
  SearchIcon,
  StarFill,
  TruckDelivery,
} from "@/icons";
import PageMeta from "@/components/common/PageMeta";
import type { ProductRow } from "@/lib/database";
import { listProducts, listMyPointTransactions, listGiftRequests, listProductCategories } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "@/hooks/useRemoteData";
import { productText } from "@/lib/product-display";
const loadRewards = async () => {
  const [products, requests, categories] = await Promise.all([listProducts({ status: "published" }), listGiftRequests(), listProductCategories()]);
  return { products, requests, categories };
};

export default function RewardsHub() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [notice, setNotice] = useState("");
  const { data, error, refresh } = useRemoteData(loadRewards, { pollIntervalMs: 5000, revalidateOnFocus: true });
  const { user } = useAuth();
  const loadPoints = useCallback(async () => (await listMyPointTransactions()).filter((row) => row.customer_id ? row.customer_id === user?.id : row.customer_email === user?.email), [user?.id, user?.email]);
  const { data: transactions, error: pointsError, refresh: refreshPoints, refreshing: pointsRefreshing } = useRemoteData(loadPoints, { pollIntervalMs: 5000, revalidateOnFocus: true });
  const balance = transactions?.reduce((sum, entry) => sum + (entry.type === "credit" ? entry.points : -entry.points), 0);

  const visibleProducts = useMemo(
    () =>
      (data?.products || []).filter(
        (product) => (!activeCategory || product.category === activeCategory) && [productText(product, "name", t), productText(product, "description", t), product.category].join(" ").toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [data, activeCategory, search, t],
  );

  return (
    <div className="space-y-6">
      <PageMeta
        title={t("rewards.pageTitle")}
        description={t("rewards.pageDescription")}
      />

      {error && <p role="alert" className="rounded-xl bg-error-50 p-4 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">{t(error)}</p>}
      {notice && (
        <div className="fixed end-6 top-6 z-9999 flex max-w-sm items-center gap-3 rounded-2xl border border-success-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xl dark:border-success-500/30 dark:bg-gray-900 dark:text-gray-200">
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-success-500" />
          {notice}
          <button className="ms-auto text-gray-400 hover:text-gray-700" onClick={() => setNotice("")} aria-label={t("rewards.close")}>
            <CloseLineIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gray-950 bg-cover bg-center px-6 py-8 text-white shadow-theme-lg md:px-10 md:py-10" style={{ backgroundImage: "url('/images/brand/rewards-starry-sky.png')" }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-r from-gray-950/35 to-transparent" />
        <div className="relative z-10 max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
            <StarFill className="h-3.5 w-3.5" /> {t("rewards.customerRewards")}
          </span>
          <h1 className="max-w-2xl text-title-sm font-semibold leading-tight md:text-title-md">
            {t("rewards.heroTitle")}
          </h1>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#rewards" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              {t("rewards.browseRewards")} <ArrowRightIcon className="h-4 w-4" />
            </a>
            <Link to="/redemptions" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              {t("rewards.viewMyRequests")}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t("rewards.availablePoints")}</span>
            <span className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"><StarFill className="h-5 w-5" /></span>
          </div>
          <div aria-live="polite" className="mt-4 flex items-end gap-2"><span className="text-3xl font-semibold text-gray-900 dark:text-white">{balance === undefined ? "—" : balance.toLocaleString()}</span><span className="mb-1 text-sm text-gray-500">{t("rewards.pointsShort")}</span></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-gray-500 dark:text-gray-400">{t("rewards.pointsAutoSync")}</span><button type="button" disabled={pointsRefreshing} onClick={refreshPoints} className="text-sm font-medium text-brand-600 disabled:opacity-50 dark:text-brand-400">{t(pointsRefreshing ? "rewards.pointsSyncing" : "rewards.refreshPoints")}</button></div>
          {pointsError && <p role="alert" className="mt-2 text-sm text-error-600 dark:text-error-400">{t("rewards.pointsSyncFailed")}</p>}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">{t("rewards.activeRequests")}</span><span className="rounded-lg bg-blue-light-50 p-2 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400"><ClockIcon className="h-5 w-5" /></span></div>
          <div className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">{data ? data.requests.filter((r) => ["pending", "processing"].includes(r.status)).length : "—"}</div>
          <Link to="/redemptions" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">{t("rewards.trackRequest")} <ArrowRightIcon className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main id="rewards" className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-medium text-brand-600 dark:text-brand-400">{t("rewards.catalog")}</p><h2 className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white">{t("rewards.chooseUseful")}</h2></div>
            <div className="relative"><SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label={t("rewards.searchLabel")} placeholder={t("rewards.searchPlaceholder")} className="h-10 w-56 rounded-xl border border-gray-200 bg-white ps-9 pe-3 text-sm text-gray-700 outline-none transition focus:border-brand-400 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200" /></div>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {[{ id: "all", name: "" }, ...(data?.categories || [])].map((category) => <button key={category.id} onClick={() => setActiveCategory(category.name)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === category.name ? "bg-brand-500 text-white shadow-theme-xs" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-300 dark:ring-gray-800 dark:hover:bg-white/[0.06]"}`}>{category.name || t("rewards.categories.all")}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {data && visibleProducts.length === 0 && <p className="col-span-full rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">{t(search.trim() ? "portalFixes.noMatches" : "rewards.noCategoryProducts")}</p>}
            {visibleProducts.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]">
                <ProductGallery images={productImages(product)} name={productText(product, "name", t)}>{product.featured && <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-600 shadow-theme-xs dark:bg-gray-900/90 dark:text-brand-400">{t("rewards.featured")}</span>}</ProductGallery>
                <div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.category}</p><h3 className="mt-1 font-semibold text-gray-900 dark:text-white">{productText(product, "name", t)}</h3></div><span className="shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{product.variants?.length ? t("productVariants.fromPoints", { points: product.points.toLocaleString() }) : `${product.points.toLocaleString()} ${t("rewards.pointsShort")}`}</span></div><p className="mt-3 min-h-10 text-sm leading-5 text-gray-500 dark:text-gray-400">{productText(product, "description", t)}</p><button onClick={() => { setSelectedProduct(product); }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">{t("rewards.redeem")} <ArrowRightIcon className="h-4 w-4" /></button></div>
              </article>
            ))}
          </div>
        </main>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900 dark:text-white">{t("rewards.recentActivity")}</h3><Link to="/points-exchange#points-ledger" className="text-xs font-semibold text-brand-600 dark:text-brand-400">{t("rewards.seeAll")}</Link></div><div className="mt-4 space-y-4">{(transactions || []).slice(0, 5).map((transaction) => <div key={transaction.id} className="flex gap-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${transaction.type === "credit" ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"}`}>{transaction.type === "credit" ? <StarFill className="h-3.5 w-3.5" /> : <TruckDelivery className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">{pointDescription(transaction, t, i18n.language) || t("customerManager.manual")}</p><div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs text-gray-400">{new Date(transaction.created_at).toLocaleDateString()}</span><span className={`text-xs font-semibold ${transaction.type === "credit" ? "text-success-600 dark:text-success-400" : "text-gray-700 dark:text-gray-300"}`}>{transaction.type === "credit" ? "+" : "−"}{transaction.points.toLocaleString()}</span></div></div></div>)}</div></div>
        </aside>
      </div>

      {selectedProduct && <ProductRedemptionDialog product={selectedProduct} onClose={() => setSelectedProduct(null)} onRedeemed={() => { setNotice(t("rewards.requestAdded", { name: productText(selectedProduct, "name", t) })); setSelectedProduct(null); refresh(); refreshPoints(); }} />}
    </div>
  );
}
