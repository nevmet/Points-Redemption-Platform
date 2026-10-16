import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/common/PageMeta";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import MessageReply from "@/components/rewards/MessageReply";
import useRemoteData from "@/hooks/useRemoteData";
import { apiErrorKey, deleteContactMessage, listContactMessages, replyContactMessage, submitContactMessage } from "@/lib/api";
import { createUuid } from "@/lib/uuid";
import { useAuth } from "@/context/AuthContext";
import type { ContactMessageRow } from "@/lib/database";

export default function ContactUs({ forReview = false }: { forReview?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const load = useCallback(() => user ? listContactMessages(page, forReview) : Promise.resolve([]), [page, forReview, user]);
  const { data, error, refresh, refreshing } = useRemoteData(load, { revalidateOnFocus: true, pollIntervalMs: 15000 });
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleting, setDeleting] = useState<ContactMessageRow | null>(null);
  const attempt = useRef<{ body: string; id: string } | null>(null);
  const send = async () => {
    if (busy || !body.trim()) return;
    setBusy(true); setActionError(""); setNotice("");
    if (attempt.current?.body !== body.trim()) attempt.current = { body: body.trim(), id: createUuid() };
    try {
      await submitContactMessage(body, attempt.current.id);
      attempt.current = null; setBody(""); setPage(0); refresh(); setNotice("contact.sent");
    } catch (failure) { setActionError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true); setActionError("");
    try { await deleteContactMessage(deleting.id); setDeleting(null); refresh(); setNotice("contact.deleted"); }
    catch (failure) { setActionError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <PageMeta title={`${t(forReview ? "contact.adminTitle" : "contact.title")} | Bags Star`} description={t("contact.description")} />
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">{t(forReview ? "contact.adminTitle" : "contact.title")}</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t(forReview ? "contact.adminHint" : "contact.description")}</p></div><Button variant="outline" disabled={refreshing} onClick={refresh}>{t("pointsExchange.refresh")}</Button></div>
    {!forReview && <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <label className="block text-sm font-medium text-gray-900 dark:text-white">{t("contact.message")}
        <textarea value={body} onChange={event => setBody(event.target.value)} maxLength={2000} rows={4} disabled={busy} placeholder={t("contact.placeholder")} className="mt-3 w-full rounded-lg border border-gray-300 bg-transparent p-3 dark:border-gray-700" />
      </label>
      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-gray-500">{body.length}/2000</span><Button disabled={busy || !body.trim()} onClick={() => void send()}>{t(busy ? "adminOrderPoints.saving" : "contact.send")}</Button></div>
    </section>}
    {notice && <p role="status" className="text-sm text-success-600 dark:text-success-400">{t(notice)}</p>}
    {(error || (actionError && !deleting)) && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(error || actionError)}</p>}
    {!data && !error && <p role="status" className="text-sm text-gray-500">{t("pointsExchange.loading")}</p>}
    {data?.length === 0 && <p className="rounded-xl border border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-800">{t("contact.empty")}</p>}
    {data?.map(message => <article key={message.id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap justify-between gap-3"><div>{forReview && <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">{message.customer_name} · {message.customer_email}</p>}<p className="mt-1 text-xs text-gray-500">{new Date(message.created_at).toLocaleString(i18n.language)}</p></div>{forReview && <Button size="sm" variant="outline" onClick={() => { setDeleting(message); setActionError(""); }}>{t("contact.delete")}</Button>}</div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-white">{message.body}</p>
      <MessageReply reply={message.reply} repliedAt={message.replied_at} canReply={forReview} onSave={async reply => { await replyContactMessage(message.id, reply); refresh(); }} />
    </article>)}
    <div className="flex justify-between gap-3"><Button variant="outline" disabled={page === 0 || refreshing} onClick={() => setPage(page - 1)}>{t("contact.previous")}</Button><Button variant="outline" disabled={!data || data.length < 20 || refreshing} onClick={() => setPage(page + 1)}>{t("contact.next")}</Button></div>
    {deleting && <Modal isOpen onClose={() => { if (!busy) setDeleting(null); }} className="mx-4 max-w-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("contact.delete")}</h2><p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{t("contact.deleteConfirm")}</p>
      <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-gray-500">{deleting.body}</p>
      {actionError && <p role="alert" className="mt-3 text-error-600">{t(actionError)}</p>}
      <div className="mt-5 flex gap-3"><Button disabled={busy} onClick={() => void remove()}>{t("contact.delete")}</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>{t("rewards.cancel")}</Button></div>
    </Modal>}
  </div>;
}
