import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { orderPointsErrorCode, reviewOrderPointRequest, type OrderPointsErrorCode } from "@/lib/api";
import type { OrderPointRequestRow } from "@/lib/database";

export default function OrderPointsReviewForm({ request, onReviewed }: { request: OrderPointRequestRow; onReviewed: (request: OrderPointRequestRow) => void }) {
  const { t } = useTranslation();
  const pending = useRef(false);
  const [approve, setApprove] = useState(true);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [saveError, setSaveError] = useState<OrderPointsErrorCode | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    const amount = Number(points);
    if (approve && (!/^\d+$/.test(points) || !Number.isInteger(amount) || amount <= 0 || amount > 2147483647)) {
      setValidationError(true);
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    pending.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      onReviewed(await reviewOrderPointRequest(request.id, approve, approve ? amount : null, note, request.order_number));
    } catch (error) {
      setSaveError(orderPointsErrorCode(error));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4 border-t border-gray-100 pt-5 dark:border-gray-800">
      {confirming ? (
        <p className="break-words rounded-lg bg-brand-50 p-4 text-sm leading-6 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">{t(approve ? "adminOrderPoints.confirmAward" : "adminOrderPoints.confirmReject", { email: request.customer_email, order: request.order_number, points })}</p>
      ) : (
        <>
          <div>
            <Label htmlFor={`decision-${request.id}`}>{t("adminOrderPoints.decision")}</Label>
            <select id={`decision-${request.id}`} value={approve ? "approve" : "reject"} onChange={(event) => { setApprove(event.target.value === "approve"); setValidationError(false); }} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <option value="approve">{t("adminOrderPoints.approve")}</option>
              <option value="reject">{t("adminOrderPoints.reject")}</option>
            </select>
          </div>
          {approve && <div>
            <Label htmlFor={`points-${request.id}`}>{t("adminOrderPoints.points")}</Label>
            <Input id={`points-${request.id}`} inputMode="numeric" value={points} onChange={(event) => { setPoints(event.target.value); setValidationError(false); }} maxLength={10} error={validationError} aria-invalid={validationError} aria-describedby={validationError ? `points-error-${request.id}` : undefined} />
            {validationError && <p id={`points-error-${request.id}`} role="alert" className="mt-2 text-sm text-error-600 dark:text-error-400">{t("adminOrderPoints.pointsRequired")}</p>}
          </div>}
          <div>
            <Label htmlFor={`note-${request.id}`}>{t("adminOrderPoints.note")}</Label>
            <Input id={`note-${request.id}`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} />
          </div>
        </>
      )}
      {saveError && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t(`pointsExchange.errors.${saveError}`)}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>{t(saving ? "adminOrderPoints.saving" : confirming ? "adminOrderPoints.confirm" : "adminOrderPoints.review")}</Button>
        {confirming && <Button type="button" variant="outline" disabled={saving} onClick={() => { setConfirming(false); setSaveError(null); }}>{t("adminOrderPoints.back")}</Button>}
      </div>
    </form>
  );
}
