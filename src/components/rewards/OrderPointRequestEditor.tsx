import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { orderPointsErrorCode, updateOrderPointRequest } from "@/lib/api";
import type { OrderPointRequestRow } from "@/lib/database";

export default function OrderPointRequestEditor({ request, onSaved }: { request: OrderPointRequestRow; onSaved: (request: OrderPointRequestRow) => void }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [number, setNumber] = useState(request.order_number);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (!number.trim()) { setMessage("pointsExchange.orderRequired"); return; }
    pending.current = true; setBusy(true); setMessage("");
    try {
      onSaved(await updateOrderPointRequest(request.id, number));
      setEditing(false); setMessage("pointsExchange.editSaved");
    } catch (error) { setMessage(`pointsExchange.errors.${orderPointsErrorCode(error)}`); }
    finally { pending.current = false; setBusy(false); }
  };
  return <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
    {request.status !== "pending" ? <p className="text-xs text-gray-500 dark:text-gray-400">{t("pointsExchange.editLocked")}</p> : editing ? (
      <form onSubmit={save}>
        <Label htmlFor={`edit-order-${request.id}`}>{t("pointsExchange.orderNumber")}</Label>
        <Input id={`edit-order-${request.id}`} value={number} onChange={(event) => { setNumber(event.target.value); setMessage(""); }} maxLength={100} required disabled={busy} autoComplete="off" />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={busy}>{t(busy ? "pointsExchange.editSaving" : "pointsExchange.editSave")}</Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { setEditing(false); setMessage(""); }}>{t("pointsExchange.editCancel")}</Button>
        </div>
      </form>
    ) : <Button type="button" size="sm" variant="outline" onClick={() => { setNumber(request.order_number); setMessage(""); setEditing(true); }}>{t("pointsExchange.edit")}</Button>}
    {message && <p role="status" className="mt-3 text-sm text-gray-700 dark:text-gray-300">{t(message)}</p>}
  </div>;
}
