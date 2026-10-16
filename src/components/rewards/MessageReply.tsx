import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/button/Button";
import { apiErrorKey } from "@/lib/api";

export default function MessageReply({ reply, repliedAt, canReply, onSave }: {
  reply?: string; repliedAt?: string | null; canReply: boolean; onSave: (reply: string) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (busy || !draft.trim()) return;
    setBusy(true); setError("");
    try { await onSave(draft); setEditing(false); }
    catch (failure) { setError(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  return <div className="mt-4 space-y-3">
    {reply && <div className="rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
      <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">{t("contact.reply")}{repliedAt && <span className="ms-2 font-normal">{new Date(repliedAt).toLocaleString(i18n.language)}</span>}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">{reply}</p>
    </div>}
    {canReply && (editing ? <div>
      <label className="block text-sm text-gray-700 dark:text-gray-300">{t("contact.reply")}
        <textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={3} disabled={busy} className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-3 dark:border-gray-700" />
      </label>
      {error && <p role="alert" className="my-2 text-sm text-error-600 dark:text-error-400">{t(error)}</p>}
      <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" disabled={busy || !draft.trim()} onClick={() => void save()}>{t(busy ? "adminOrderPoints.saving" : "contact.saveReply")}</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(false)}>{t("rewards.cancel")}</Button></div>
    </div> : <Button size="sm" variant="outline" onClick={() => { setDraft(reply || ""); setError(""); setEditing(true); }}>{t(reply ? "contact.editReply" : "contact.replyAction")}</Button>)}
  </div>;
}
