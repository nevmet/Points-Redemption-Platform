import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { apiErrorKey, changePassword } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ChangePasswordDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (password !== confirm) { setError("passwordChange.mismatch"); return; }
    setError(""); pending.current = true; setBusy(true);
    try { await changePassword(current, password); setCurrent(""); setPassword(""); setConfirm(""); onSaved(); }
    catch (failure) { setError(apiErrorKey(failure)); }
    finally { pending.current = false; setBusy(false); }
  };
  return <Modal isOpen onClose={() => { if (!pending.current) onClose(); }} showCloseButton={false} className="mx-4 max-w-md p-6">
    <div role="dialog" aria-modal="true" aria-labelledby="password-change-title" aria-describedby="password-change-hint">
      <h2 id="password-change-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t("userProfile.changePassword")}</h2>
      <p className="mt-2 break-all text-sm font-medium text-gray-700 dark:text-gray-300">{t("passwordChange.account", { name: user?.username || user?.email || "" })}</p>
      <p id="password-change-hint" className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("passwordChange.hint")}</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        <div><Label htmlFor="current-password">{t("passwordChange.current")}</Label><Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required maxLength={256} disabled={busy} /></div>
        <div><Label htmlFor="new-password">{t("passwordChange.new")}</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} disabled={busy} /></div>
        <div><Label htmlFor="confirm-password">{t("passwordChange.confirm")}</Label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} maxLength={128} disabled={busy} /></div>
        {error && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(error)}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("rewards.cancel")}</Button><Button type="submit" disabled={busy}>{t(busy ? "passwordChange.saving" : "passwordChange.save")}</Button></div>
      </form>
    </div>
  </Modal>;
}
