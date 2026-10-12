import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRightIcon,
  CallIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseLineIcon,
  EnvelopeIcon,
  SearchIcon,
  StarFill,
  TruckDelivery,
} from "@/icons";
import PageMeta from "@/components/common/PageMeta";
import {
  customerTransactions,
  rewardProducts,
  type RewardCategory,
  type RewardProduct,
} from "@/data/rewards";

const categories: RewardCategory[] = ["All", "Travel", "Daily", "Branding"];

export default function RewardsHub() {
  const [activeCategory, setActiveCategory] = useState<RewardCategory>("All");
  const [selectedProduct, setSelectedProduct] = useState<RewardProduct | null>(null);
  const [notice, setNotice] = useState("");

  const visibleProducts = useMemo(
    () =>
      rewardProducts.filter(
        (product) => activeCategory === "All" || product.category === activeCategory,
      ),
    [activeCategory],
  );

  const handleRedeem = () => {
    if (!selectedProduct) return;
    setNotice(`${selectedProduct.name} added to your redemption request.`);
    setSelectedProduct(null);
    window.setTimeout(() => setNotice(""), 4200);
  };

  return (
    <div className="space-y-6">
      <PageMeta
        title="Rewards Center | Bags Star"
        description="Browse your Bags Star rewards and redeem customer benefits."
      />

      {notice && (
        <div className="fixed end-6 top-6 z-9999 flex max-w-sm items-center gap-3 rounded-2xl border border-success-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xl dark:border-success-500/30 dark:bg-gray-900 dark:text-gray-200">
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-success-500" />
          {notice}
          <button className="ms-auto text-gray-400 hover:text-gray-700" onClick={() => setNotice("")} aria-label="Close notification">
            <CloseLineIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-theme-purple-500 px-6 py-8 text-white shadow-theme-lg md:px-10 md:py-10">
        <div className="relative z-10 max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
            <StarFill className="h-3.5 w-3.5" /> Customer rewards
          </span>
          <h1 className="max-w-xl text-title-sm font-semibold leading-tight md:text-title-md">
            Make every Bags Star order go further.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 md:text-base">
            Redeem practical products and brand services with points earned from your verified orders.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#rewards" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-25">
              Browse rewards <ArrowRightIcon className="h-4 w-4" />
            </a>
            <Link to="/redemptions" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
              View my requests
            </Link>
          </div>
        </div>
        <div className="absolute -end-12 -top-16 h-72 w-72 rounded-full border-[36px] border-white/10" />
        <div className="absolute -end-24 -bottom-36 h-80 w-80 rounded-full border-[48px] border-white/10" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Available points</span>
            <span className="rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"><StarFill className="h-5 w-5" /></span>
          </div>
          <div className="mt-4 flex items-end gap-2"><span className="text-3xl font-semibold text-gray-900 dark:text-white">2,580</span><span className="mb-1 text-sm text-gray-500">pts</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full w-[72%] rounded-full bg-brand-500" /></div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">420 points until Gold benefits</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Current tier</span><span className="rounded-lg bg-warning-50 p-2 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"><StarFill className="h-5 w-5" /></span></div>
          <div className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">Silver</div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Priority sampling and faster quote reviews</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Active requests</span><span className="rounded-lg bg-blue-light-50 p-2 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400"><ClockIcon className="h-5 w-5" /></span></div>
          <div className="mt-4 text-3xl font-semibold text-gray-900 dark:text-white">1</div>
          <Link to="/redemptions" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">Track request <ArrowRightIcon className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main id="rewards" className="min-w-0">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-medium text-brand-600 dark:text-brand-400">Rewards catalog</p><h2 className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white">Choose something useful</h2></div>
            <div className="relative"><SearchIcon className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input aria-label="Search rewards" placeholder="Search rewards" className="h-10 w-56 rounded-xl border border-gray-200 bg-white ps-9 pe-3 text-sm text-gray-700 outline-none transition focus:border-brand-400 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-200" /></div>
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === category ? "bg-brand-500 text-white shadow-theme-xs" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-300 dark:ring-gray-800 dark:hover:bg-white/[0.06]"}`}>{category}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <article key={product.id} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-theme-lg dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800"><img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />{product.featured && <span className="absolute start-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-600 shadow-theme-xs">Featured</span>}</div>
                <div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-gray-400">{product.category}</p><h3 className="mt-1 font-semibold text-gray-900 dark:text-white">{product.name}</h3></div><span className="shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{product.points.toLocaleString()} pts</span></div><p className="mt-3 min-h-10 text-sm leading-5 text-gray-500 dark:text-gray-400">{product.description}</p><button onClick={() => setSelectedProduct(product)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">Redeem this reward <ArrowRightIcon className="h-4 w-4" /></button></div>
              </article>
            ))}
          </div>
        </main>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900 dark:text-white">Need help?</h3><span className="rounded-lg bg-success-50 p-2 text-success-600 dark:bg-success-500/15 dark:text-success-400"><CallIcon className="h-5 w-5" /></span></div><p className="mt-2 text-sm leading-5 text-gray-500 dark:text-gray-400">Your business contact will confirm availability and share the delivery timeline.</p><div className="mt-4 space-y-3 text-sm"><a href="mailto:info@ahhdbag.cn" className="flex items-center gap-2 text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400"><EnvelopeIcon className="h-4 w-4 text-gray-400" /> info@ahhdbag.cn</a><a href="tel:+8619156099816" className="flex items-center gap-2 text-gray-700 hover:text-brand-600 dark:text-gray-300 dark:hover:text-brand-400"><CallIcon className="h-4 w-4 text-gray-400" /> +86 191 5609 9816</a></div><Link to="/redemptions" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/[0.06]">View request status <ArrowRightIcon className="h-4 w-4" /></Link></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900 dark:text-white">Recent activity</h3><Link to="/redemptions" className="text-xs font-semibold text-brand-600 dark:text-brand-400">See all</Link></div><div className="mt-4 space-y-4">{customerTransactions.map((transaction) => <div key={transaction.label} className="flex gap-3"><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${transaction.type === "credit" ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"}`}>{transaction.type === "credit" ? <StarFill className="h-3.5 w-3.5" /> : <TruckDelivery className="h-3.5 w-3.5" />}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-700 dark:text-gray-200">{transaction.label}</p><div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs text-gray-400">{transaction.date}</span><span className={`text-xs font-semibold ${transaction.type === "credit" ? "text-success-600 dark:text-success-400" : "text-gray-700 dark:text-gray-300"}`}>{transaction.points}</span></div></div></div>)}</div></div>
        </aside>
      </div>

      {selectedProduct && <div className="fixed inset-0 z-9999 flex items-center justify-center bg-gray-950/40 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">Redemption request</p><h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">Redeem {selectedProduct.name}?</h2></div><button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200" onClick={() => setSelectedProduct(null)} aria-label="Close"><CloseLineIcon className="h-5 w-5" /></button></div><div className="mt-5 flex gap-4 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]"><img src={selectedProduct.image} alt="" className="h-20 w-24 rounded-lg object-cover" /><div><p className="text-sm font-medium text-gray-900 dark:text-white">{selectedProduct.points.toLocaleString()} points</p><p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">A business representative will contact you to confirm availability and delivery details.</p></div></div><div className="mt-6 flex gap-3"><button onClick={() => setSelectedProduct(null)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300">Cancel</button><button onClick={handleRedeem} className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Submit request</button></div></div></div>}
    </div>
  );
}
