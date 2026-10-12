import { useState } from "react";
import { Link } from "react-router";
import { ArrowRightIcon, CheckCircleIcon, EditIcon, PlusIcon, SearchIcon } from "@/icons";
import PageMeta from "@/components/common/PageMeta";
import { rewardProducts } from "@/data/rewards";

export default function AdminProducts() {
  const [products, setProducts] = useState(rewardProducts);
  const [saved, setSaved] = useState(false);

  const toggleStatus = (id: number) => {
    setProducts((current) => current.map((product) => product.id === id ? { ...product, status: product.status === "Published" ? "Draft" : "Published" } : product));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  };

  return (
    <div className="space-y-6">
      <PageMeta title="Reward Catalog | Bags Star" description="Manage the products available in the Bags Star points catalog." />
      {saved && <div className="flex items-center gap-2 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm font-medium text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400"><CheckCircleIcon className="h-4 w-4" /> Demo change saved. This page is ready to connect to a database later.</div>}
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-brand-600 dark:text-brand-400">Admin preview</p><h1 className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white">Reward catalog</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Publish useful products and set the points required for redemption.</p></div><button className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"><PlusIcon className="h-4 w-4" /> Add reward</button></div>
      <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-sm text-gray-500 dark:text-gray-400">Published rewards</p><p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{products.filter((product) => product.status === "Published").length}</p></div><div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-sm text-gray-500 dark:text-gray-400">Total catalog items</p><p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{products.length}</p></div><div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-sm text-gray-500 dark:text-gray-400">Requests this month</p><p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">18</p></div></div>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800"><div><h2 className="font-semibold text-gray-900 dark:text-white">All rewards</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Click publish status to preview a live update.</p></div><div className="relative"><SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input placeholder="Search catalog" className="h-9 w-48 rounded-lg border border-gray-200 bg-white ps-9 pe-3 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-200" /></div></div><div className="divide-y divide-gray-100 dark:divide-gray-800">{products.map((product) => <div key={product.id} className="flex flex-wrap items-center gap-4 px-5 py-4"><img src={product.image} alt="" className="h-14 w-16 rounded-xl object-cover" /><div className="min-w-48 flex-1"><p className="font-semibold text-gray-900 dark:text-white">{product.name}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{product.category} · {product.points.toLocaleString()} points</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.status === "Published" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>{product.status}</span><button onClick={() => toggleStatus(product.id)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400">{product.status === "Published" ? "Unpublish" : "Publish"}</button><button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-gray-800 dark:hover:text-brand-400" aria-label={`Edit ${product.name}`}><EditIcon className="h-4 w-4" /></button></div>)}</div></section>
      <Link to="/admin/redemptions" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">Review redemption requests <ArrowRightIcon className="h-4 w-4" /></Link>
    </div>
  );
}
