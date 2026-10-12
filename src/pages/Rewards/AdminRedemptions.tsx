import { useState } from "react";
import { CheckCircleIcon, ClockIcon, MailIcon, TruckDelivery } from "@/icons";
import PageMeta from "@/components/common/PageMeta";

type RequestStatus = "Pending" | "Processing" | "Completed";

const initialRequests = [
  { id: "REW-24018", customer: "Olivia Chen", company: "Northwind Imports", email: "olivia@northwind.example", product: "Custom Travel Duffel", points: 1600, status: "Processing" as RequestStatus, date: "22 Sep 2026" },
  { id: "REW-24017", customer: "Daniel Miller", company: "Miller & Co.", email: "daniel@miller.example", product: "Weekend Explorer Backpack", points: 1200, status: "Pending" as RequestStatus, date: "21 Sep 2026" },
  { id: "REW-24011", customer: "Sofia Garcia", company: "Luma Retail", email: "sofia@luma.example", product: "Canvas Utility Pouch", points: 600, status: "Completed" as RequestStatus, date: "18 Sep 2026" },
];

export default function AdminRedemptions() {
  const [requests, setRequests] = useState(initialRequests);
  const [savedId, setSavedId] = useState("");

  const updateStatus = (id: string, status: RequestStatus) => {
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
    setSavedId(id);
    window.setTimeout(() => setSavedId(""), 2200);
  };

  return (
    <div className="space-y-6">
      <PageMeta title="Redemption Requests | Bags Star" description="Review and update customer reward redemption requests." />
      <div><p className="text-sm font-medium text-brand-600 dark:text-brand-400">Admin preview</p><h1 className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white">Redemption requests</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Move a request through the sales follow-up process and keep the customer informed.</p></div>
      <div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-sm text-gray-500 dark:text-gray-400">Pending review</p><p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{requests.filter((request) => request.status === "Pending").length}</p></div><div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-sm text-gray-500 dark:text-gray-400">In progress</p><p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{requests.filter((request) => request.status === "Processing").length}</p></div><div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p className="text-sm text-gray-500 dark:text-gray-400">Completed this month</p><p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{requests.filter((request) => request.status === "Completed").length}</p></div></div>
      <section className="space-y-4">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${request.status === "Completed" ? "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400" : request.status === "Processing" ? "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400" : "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"}`}>{request.status === "Completed" ? <CheckCircleIcon className="h-5 w-5" /> : request.status === "Processing" ? <TruckDelivery className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-gray-900 dark:text-white">{request.product}</h2><span className="text-xs text-gray-400">{request.id}</span></div><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{request.customer} · {request.company}</p><a href={`mailto:${request.email}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"><MailIcon className="h-3.5 w-3.5" /> {request.email}</a></div></div><div className="text-end"><p className="font-semibold text-gray-900 dark:text-white">{request.points.toLocaleString()} pts</p><p className="mt-1 text-xs text-gray-400">{request.date}</p></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "Completed" ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" : request.status === "Processing" ? "bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400" : "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"}`}>{request.status}</span><div className="flex items-center gap-2"><select value={request.status} onChange={(event) => updateStatus(request.id, event.target.value as RequestStatus)} className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"><option>Pending</option><option>Processing</option><option>Completed</option></select>{savedId === request.id && <span className="text-xs font-medium text-success-600 dark:text-success-400">Saved</span>}</div></div></article>)}</section>
    </div>
  );
}
