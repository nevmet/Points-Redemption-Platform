import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "@/hooks/useRemoteData";
import { getMyProfile, saveMyProfile, validateAvatarFile, apiErrorKey, type CustomerProfile } from "@/lib/api";
import Button from "@/components/ui/button/Button";
import ProfileAvatar from "./ProfileAvatar";
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
  const [avatar, setAvatar] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [checking, setChecking] = useState(false);
  const selection = useRef(0);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const clearAvatar = () => { selection.current++; setAvatar(undefined); setPreview(undefined); setChecking(false); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!draft || busy || checking) return;
    setBusy(true); setNotice("");
    try { await saveMyProfile(draft, avatar); setDraft(null); clearAvatar(); refresh(); await onSaved(); setNotice("portalFixes.saved"); }
    catch (failure) { setNotice(apiErrorKey(failure)); }
    finally { setBusy(false); }
  };
  const current = draft || profile;
  return <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
    <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">{t("portalFixes.profile")}</h2>
    {error && <p role="alert" className="text-error-600 dark:text-error-400">{t(error)} <button onClick={refresh}>{t("pointsExchange.refresh")}</button></p>}
    {notice && <p role={notice === "portalFixes.saved" ? "status" : "alert"} className={`mb-4 text-sm ${notice === "portalFixes.saved" ? "text-brand-600 dark:text-brand-400" : "text-error-600 dark:text-error-400"}`}>{t(notice)}</p>}
    {!current ? <p>{t("pointsExchange.loading")}</p> : <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full text-2xl"><ProfileAvatar url={preview || current.avatarUrl} name={current.name} /></div>
        {draft && <div className="space-y-2">
          <label htmlFor="profile-avatar" className="block text-sm font-medium text-gray-900 dark:text-white">{t("profileAvatar.change")}</label>
          <input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="block w-full max-w-xs text-sm text-gray-600 dark:text-gray-300" onChange={async event => {
            const file = event.target.files?.[0]; event.target.value = "";
            if (!file) return;
            const request = ++selection.current; setChecking(true); setNotice("");
            try { await validateAvatarFile(file); if (request === selection.current) { setAvatar(file); setPreview(URL.createObjectURL(file)); } }
            catch (failure) { if (request === selection.current) setNotice(apiErrorKey(failure)); }
            finally { if (request === selection.current) setChecking(false); }
          }} />
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("profileAvatar.hint")}</p>
        </div>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{(["name", "email", "company", "phone"] as const).map(field => <div key={field}>
        <label htmlFor={"profile-" + field} className="mb-2 block text-sm text-gray-600 dark:text-gray-300">{t("portalFixes." + field)}</label>
        {draft && field !== "email" ? <input id={"profile-" + field} value={draft[field]} required={field === "name"} maxLength={field === "name" ? 120 : field === "phone" ? 50 : 160} onChange={event => setDraft({ ...draft, [field]: event.target.value })} disabled={busy} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-gray-900 dark:border-gray-700 dark:text-white" /> : <p className="break-words text-sm text-gray-900 dark:text-white">{current[field] || t("portalFixes.notSet")}</p>}
      </div>)}</div>
      {draft ? <div className="flex gap-3"><Button type="submit" disabled={busy || checking}>{t(busy ? "adminOrderPoints.saving" : "catalogEditor.saveChanges")}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(null); clearAvatar(); }}>{t("rewards.cancel")}</Button></div> : <Button type="button" variant="outline" onClick={() => { setDraft(profile); setNotice(""); }}>{t("userProfile.edit")}</Button>}
    </form>}
  </section>;
}
