import MessageReply from "./MessageReply";
import ShippingAddressDetails from "./ShippingAddressDetails";
import { specificationTerm, specificationText } from "@/lib/product-specification-display";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import PageMeta from "@/components/common/PageMeta";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "@/hooks/useRemoteData";
import { apiErrorKey, listGiftRequests, setRedemptionRequestStatus, replyGiftRequest } from "@/lib/api";
import type { RedemptionStatus, RedemptionRequestRow } from "@/lib/database";

export default function GiftRequestList({ forReview = false }: { forReview?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const load = useCallback(() => user ? listGiftRequests(forReview) : Promise.resolve([]), [user, forReview]);
  const { data, error, refresh } = useRemoteData(load, { pollIntervalMs: 5000, revalidateOnFocus: true });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<{ request: RedemptionRequestRow; status: RedemptionStatus } | null>(null);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [limit, setLimit] = useState(20);
  const prefix = forReview ? "adminRedemptions" : "redemptions";
  const update = async () => {
    if (!action || busy) return;
    setBusy(true); setActionError("");
    try { await setRedemptionRequestStatus(action.request.id, action.status, note.trim()); refresh(); setNotice("adminRedemptions.saved"); setAction(null); }
    catch (failure) { setActionError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  const refund = action?.status === "cancelled" || action?.status === "rejected";
  const needsReason = refund || action?.status === "cancel_requested" || action?.request.status === "cancel_requested";
  const openAction = (request: RedemptionRequestRow, status: RedemptionStatus) => { setAction({ request, status }); setNote(""); setActionError(""); };
  return <div className="space-y-6">
    <PageMeta title={t(prefix + ".pageTitle")} description={t(prefix + ".description")} />
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">{t(prefix + ".title")}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t(forReview ? "testAuth.allRequests" : "testAuth.ownRequests")}</p></div><Button variant="outline" onClick={refresh}>{t("pointsExchange.refresh")}</Button></div>
    {notice && <p role="status" className="rounded-lg bg-brand-50 p-4 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{t(notice)}</p>}
    {error && <p role="alert" className="text-error-600 dark:text-error-400">{t(error)}</p>}
    {!data && !error ? <p role="status" className="text-gray-500 dark:text-gray-400">{t("pointsExchange.loading")}</p> : data?.length === 0 ? <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">{t("testAuth.noRequests")}</p> : <div className="space-y-4">{data?.slice(0,limit).map(request => <article key={request.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap justify-between gap-4"><div><h2 className="font-semibold text-gray-900 dark:text-white">{request.product_name || request.product_id}</h2>{request.variant_name && <p className="mt-2 break-words text-sm text-gray-700 dark:text-gray-300">{t("productVariants.selected", { name: specificationText(request.variant_name, t, i18n.language) })}</p>}{request.selected_options?.map((option, index) => <p key={index} className="mt-1 break-words text-sm text-gray-700 dark:text-gray-300">{specificationTerm(option.name, t, i18n.language)}: {specificationTerm(option.value, t, i18n.language)}</p>)}<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{request.request_code} · {new Date(request.created_at).toLocaleString(i18n.language)}</p>{forReview && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{request.customer_name} · {request.customer_email}</p>}</div><p className="font-semibold text-gray-900 dark:text-white">{request.points.toLocaleString()} {t("rewards.pointsShort")}</p></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800"><span className="text-sm text-brand-600 dark:text-brand-400">{t("adminRedemptions." + request.status)}</span><div className="flex flex-wrap gap-2">
        {forReview && request.status === "pending" && <Button size="sm" variant="outline" onClick={() => openAction(request,"processing")}>{t("adminRedemptions.processing")}</Button>}
        {forReview && ["pending","processing"].includes(request.status) && <><Button size="sm" onClick={() => openAction(request,"completed")}>{t("adminRedemptions.completed")}</Button><Button size="sm" variant="outline" onClick={() => openAction(request,"rejected")}>{t("portalFixes.rejectRefund")}</Button></>}
        {!forReview && ["pending", "processing"].includes(request.status) && <Button size="sm" variant="outline" onClick={() => openAction(request,"cancel_requested")}>{t("portalFixes.cancelRefund")}</Button>}
        {forReview && request.status === "cancel_requested" && <><Button size="sm" onClick={() => openAction(request, "cancelled")}>{t("giftMessages.approveCancellation")}</Button><Button size="sm" variant="outline" onClick={() => openAction(request, request.cancel_from_status || "pending")}>{t("giftMessages.declineCancellation")}</Button></>}
      </div></div>
      {request.status === "cancel_requested" && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{t("giftMessages.cancellationPending")}</p>}
      {request.cancellation_note && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{t("giftMessages.cancellationReason")}: {request.cancellation_note}</p>}
      {request.customer_note && <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800"><p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t("giftMessages.customerNote")}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-white">{request.customer_note}</p></div>}
      <MessageReply reply={request.admin_reply} repliedAt={request.replied_at} canReply={forReview} onSave={async reply => { await replyGiftRequest(request.id, reply); refresh(); }} />
      {request.shipping_address && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">{t("giftMessages.orderAddress")}</summary><ShippingAddressDetails address={request.shipping_address} /></details>}
      {request.resolution_note && <p className="mt-3 break-words text-sm text-gray-600 dark:text-gray-300">{t("portalFixes.reason")}: {request.resolution_note}</p>}
      {request.refunded_at && <p className="mt-2 text-sm text-success-600 dark:text-success-400">{t("portalFixes.refunded", { points: request.points.toLocaleString() })}</p>}
      {!!request.status_history?.length && <details className="mt-3 text-xs text-gray-500 dark:text-gray-400"><summary className="cursor-pointer">{t("portalFixes.history")}</summary><ul className="mt-2 space-y-2">{request.status_history.map((entry,index) => <li key={index}>{t("adminRedemptions." + entry.status)} · {new Date(entry.at).toLocaleString(i18n.language)}{entry.note && " · " + entry.note}</li>)}</ul></details>}
    </article>)}</div>}
    {data && data.length > limit && <Button variant="outline" onClick={() => setLimit(limit + 20)}>{t("portalFixes.more")}</Button>}
    {!forReview && <Link to="/" className="inline-block text-sm font-medium text-brand-600 dark:text-brand-400">{t("pointsExchange.browseGifts")}</Link>}
    {action && <Modal isOpen onClose={() => { if (!busy) setAction(null); }} className="mx-4 max-w-lg p-6"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("portalFixes.confirmAction")}</h2><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{action.request.request_code} · {t("adminRedemptions." + action.status)}</p>{needsReason && <><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{t(action.status === "cancel_requested" ? "giftMessages.cancelConfirm" : refund ? "portalFixes.refundConfirm" : "giftMessages.declineConfirm", { points: action.request.points.toLocaleString() })}</p><label className="mt-4 block text-sm text-gray-600 dark:text-gray-300" htmlFor="resolution-note">{t(forReview ? "portalFixes.reason" : "giftMessages.cancellationReason")}</label><textarea id="resolution-note" value={note} onChange={event=>setNote(event.target.value)} maxLength={1000} disabled={busy} className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-gray-900 dark:border-gray-700 dark:text-white" /></>}{actionError && <p role="alert" className="mt-3 text-error-600 dark:text-error-400">{t(actionError)}</p>}<div className="mt-5 flex gap-3"><Button disabled={busy || (needsReason && !note.trim())} onClick={() => void update()}>{t(busy ? "adminOrderPoints.saving" : "adminOrderPoints.confirm")}</Button><Button variant="outline" disabled={busy} onClick={()=>setAction(null)}>{t("rewards.cancel")}</Button></div></Modal>}
  </div>;
}
