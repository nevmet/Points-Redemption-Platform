import { pointDescription } from "@/lib/product-specification-display";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import useRemoteData from "@/hooks/useRemoteData";
import { adjustCustomerPoints, apiErrorKey, listCustomerTransactions } from "@/lib/api";
import type { CustomerSummary, PointTransactionRow } from "@/lib/database";

export default function CustomerPointsPanel({ customer, onAdjusted }: { customer: CustomerSummary; onAdjusted: (transaction: PointTransactionRow) => void }) {
  const { t, i18n } = useTranslation();
  const load = useCallback(() => listCustomerTransactions(customer.id), [customer.id]);
  const { data, error: loadError, refresh } = useRemoteData(load);
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, []);
  const operation = useRef({ signature: "", id: "" });
  const after = customer.balance + (type === "credit" ? Number(points) : -Number(points));
  return <section ref={panel} className="scroll-mt-24 space-y-5 rounded-2xl border border-brand-200 bg-white p-5 dark:border-brand-500/30 dark:bg-gray-900">
    <div><h2 className="break-words text-lg font-semibold text-gray-900 dark:text-white">{customer.username} · {t("customerManager.details")}</h2><p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400">{customer.email}</p><p className="mt-2 text-lg font-semibold text-brand-600 dark:text-brand-400">{t("customerManager.balance")}: {customer.balance.toLocaleString()}</p></div>
    <form onSubmit={async (event) => {
      event.preventDefault(); if (busy) return;
      if (!/^\d+$/.test(points) || Number(points) <= 0 || Number(points) > 2147483647) { setError("testAuth.errors.invalid"); return; }
      if (after < 0) { setError("testAuth.errors.insufficient"); return; }
      const signature = JSON.stringify([customer.id, type, Number(points), note.trim()]);
      if (operation.current.signature !== signature) operation.current = { signature, id: crypto.randomUUID() };
      setBusy(true); setError("");
      try { const transaction = await adjustCustomerPoints(customer.id, type, Number(points), note, operation.current.id); operation.current = { signature: "", id: "" }; setPoints(""); setNote(""); refresh(); onAdjusted(transaction); }
      catch (failure) { setError(apiErrorKey(failure)); }
      finally { setBusy(false); }
    }}>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="adjust-type">{t("customerManager.action")}</Label><select id="adjust-type" value={type} onChange={(event) => setType(event.target.value as "credit" | "debit")} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"><option value="credit">{t("customerManager.credit")}</option><option value="debit">{t("customerManager.debit")}</option></select></div>
        <div><Label htmlFor="adjust-points">{t("customerManager.amount")}</Label><Input id="adjust-points" required inputMode="numeric" maxLength={10} value={points} onChange={(event) => setPoints(event.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="adjust-note">{t("customerManager.note")}</Label><Input id="adjust-note" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
        <p className="text-sm text-gray-600 sm:col-span-2 dark:text-gray-300">{t("customerManager.preview", { points: /^\d+$/.test(points) ? after.toLocaleString() : customer.balance.toLocaleString() })}</p>
        {error && <p role="alert" className="text-sm text-error-600 sm:col-span-2 dark:text-error-400">{t(error)}</p>}
        <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{t(busy ? "adminOrderPoints.saving" : "customerManager.submit")}</Button></div>
      </fieldset>
    </form>
    <div className="border-t border-gray-200 pt-5 dark:border-gray-700"><h3 className="mb-3 font-semibold text-gray-900 dark:text-white">{t("customerManager.history")}</h3>
      {loadError && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(loadError)}</p>}
      {!data ? <p className="text-sm text-gray-500 dark:text-gray-400">{t("pointsExchange.loading")}</p> : !data.length ? <p className="text-sm text-gray-500 dark:text-gray-400">{t("customerManager.noHistory")}</p> : <ul className="divide-y divide-gray-100 dark:divide-gray-800">{data.map((row) => <li key={row.id} className="flex justify-between gap-3 py-3">
        <div className="min-w-0"><p className="break-words text-sm text-gray-800 dark:text-gray-200">{pointDescription(row, t, i18n.language) || t("customerManager.manual")}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{new Date(row.created_at).toLocaleString(i18n.language)}</p>{row.operator_name && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("customerManager.operator")}: {row.operator_name}</p>}{row.balance_after != null && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("customerManager.after")}: {row.balance_after.toLocaleString()}</p>}</div>
        <p className={`shrink-0 font-semibold ${row.type === "credit" ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}`}>{row.type === "credit" ? "+" : "−"}{row.points.toLocaleString()}</p>
      </li>)}</ul>}
    </div>
  </section>;
}
