import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { InfoIcon, PaperPlaneIcon, ShootingStarIcon } from "@/icons";
import { orderPointsErrorCode, submitOrderPointRequest, type OrderPointsErrorCode } from "@/lib/api";
import type { OrderPointRequestRow } from "@/lib/database";

export default function OrderPointsForm({ onSubmitted }: { onSubmitted: (request: OrderPointRequestRow) => void }) {
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<OrderPointsErrorCode | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    const trimmedOrderNumber = orderNumber.trim();
    setOrderNumber(trimmedOrderNumber);
    if (!trimmedOrderNumber) {
      setError(true);
      setSubmitError(null);
      setSubmittedOrder("");
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }

    setError(false);
    setSubmitError(null);
    setSubmittedOrder("");
    pending.current = true;
    setSubmitting(true);
    try {
      const request = await submitOrderPointRequest(trimmedOrderNumber);
      onSubmitted(request);
      setSubmittedOrder(request.order_number);
      setOrderNumber("");
    } catch (failure) {
      setSubmitError(orderPointsErrorCode(failure));
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="order-points-title" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs sm:p-8 dark:border-gray-800 dark:bg-white/3">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
          <ShootingStarIcon className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 id="order-points-title" className="text-lg font-semibold text-gray-900 dark:text-white">{t("pointsExchange.formTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{t("pointsExchange.formDescription")}</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <Label htmlFor="exchange-order-number">{t("pointsExchange.orderNumber")}</Label>
        <Input
          id="exchange-order-number"
          name="orderNumber"
          placeholder={t("pointsExchange.orderPlaceholder")}
          value={orderNumber}
          onChange={(event) => {
            setOrderNumber(event.target.value);
            setError(false);
            setSubmitError(null);
            setSubmittedOrder("");
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={100}
          disabled={submitting}
          required
          error={error}
          aria-invalid={error}
          aria-describedby={error ? "order-number-error" : "order-number-hint"}
        />
        {error ? (
          <p id="order-number-error" role="alert" className="mt-2 text-sm text-error-600 dark:text-error-400">{t("pointsExchange.orderRequired")}</p>
        ) : (
          <p id="order-number-hint" className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{t("pointsExchange.orderHint")}</p>
        )}
        <Button disabled={submitting} className="mt-6 w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500" startIcon={<PaperPlaneIcon className="size-5" aria-hidden="true" />}>
          {t(submitting ? "pointsExchange.submitting" : "pointsExchange.submitOrder")}
        </Button>
      </form>

      <div role="status" aria-live="polite">
        {submitError && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/25 dark:bg-warning-500/10">
            <InfoIcon className="mt-0.5 size-5 shrink-0 text-warning-600 dark:text-warning-400" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-warning-800 dark:text-warning-300">{t("pointsExchange.submitFailed")}</p>
              <p className="mt-1 text-sm leading-6 text-warning-800 dark:text-warning-300">{t(`pointsExchange.errors.${submitError}`)}</p>
            </div>
          </div>
        )}
        {submittedOrder && <p className="mt-5 break-all rounded-xl bg-success-50 p-4 text-sm leading-6 text-success-800 dark:bg-success-500/10 dark:text-success-300">{t("pointsExchange.submitted", { order: submittedOrder })}</p>}
      </div>
      <p className="mt-5 border-t border-gray-100 pt-5 text-xs leading-5 text-gray-500 dark:border-gray-800 dark:text-gray-400">{t("pointsExchange.confirmHint")}</p>
    </section>
  );
}
