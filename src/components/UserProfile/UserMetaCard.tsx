import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "@/hooks/useRemoteData";
import { getMyProfile, saveMyProfile, apiErrorKey, type CustomerProfile } from "@/lib/api";
import Button from "@/components/ui/button/Button";
export default function UserMetaCard() {
  const { user, refreshUser } = useAuth();
  const { data, error, refresh } = useRemoteData(getMyProfile);
  return <ProfileEditor key={user?.id} profile={data} error={error} refresh={refresh} onSaved={refreshUser} />;
}
function ProfileEditor({ profile, error, refresh, onSaved }: { profile: CustomerProfile | null; error: string; refresh: () => void; onSaved: () => Promise<void> }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CustomerProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!draft || busy) return;
    setBusy(true); setNotice("");
    try { await saveMyProfile(draft); setDraft(null); refresh(); await onSaved(); setNotice("portalFixes.saved"); }
    catch (failure) { setNotice(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  const current = draft || profile;
  return <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
    <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">{t("portalFixes.profile")}</h2>
    {error && <p role="alert" className="text-error-600 dark:text-error-400">{t(error)} <button onClick={refresh}>{t("pointsExchange.refresh")}</button></p>}
    {notice && <p role="status" className="mb-4 text-sm text-brand-600 dark:text-brand-400">{t(notice)}</p>}
    {!current ? <p>{t("pointsExchange.loading")}</p> : <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">{(["name", "email", "company", "phone"] as const).map(field => <div key={field}>
        <label htmlFor={"profile-" + field} className="mb-2 block text-sm text-gray-600 dark:text-gray-300">{t("portalFixes." + field)}</label>
        {draft && field !== "email" ? <input id={"profile-" + field} value={draft[field]} required={field === "name"} maxLength={field === "name" ? 120 : field === "phone" ? 50 : 160} onChange={event => setDraft({ ...draft, [field]: event.target.value })} disabled={busy} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-900 dark:border-gray-700 dark:text-white" /> : <p className="break-words text-sm text-gray-900 dark:text-white">{current[field] || t("portalFixes.notSet")}</p>}
      </div>)}</div>
      {draft ? <div className="flex gap-3"><Button type="submit" disabled={busy}>{t(busy ? "adminOrderPoints.saving" : "catalogEditor.saveChanges")}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>{t("rewards.cancel")}</Button></div> : <Button type="button" variant="outline" onClick={() => { setDraft(profile); setNotice(""); }}>{t("userProfile.edit")}</Button>}
    </form>}
  </section>;
}
