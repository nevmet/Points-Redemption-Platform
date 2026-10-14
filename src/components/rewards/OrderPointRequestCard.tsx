import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { OrderPointRequestRow } from "@/lib/database";

const statusStyle = {
  pending: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  approved: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  rejected: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
};

export default function OrderPointRequestCard({ request, showCustomer = false, children }: { request: OrderPointRequestRow; showCustomer?: boolean; children?: ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <article className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("pointsExchange.orderNumber")}</p>
          <h3 className="mt-1 break-all font-semibold text-gray-900 dark:text-white">{request.order_number}</h3>
          {showCustomer && <p className="mt-1 break-all text-sm text-gray-600 dark:text-gray-300">{request.customer_email}</p>}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("pointsExchange.requestedAt", { date: new Date(request.created_at).toLocaleString(i18n.language) })}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[request.status]}`}>{t(`pointsExchange.status.${request.status}`)}</span>
      </div>
      {request.status === "approved" && <p className="mt-4 text-lg font-semibold text-success-700 dark:text-success-400">+{request.awarded_points?.toLocaleString(i18n.language)} {t("rewards.pointsShort")}</p>}
      {request.reviewed_at && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("pointsExchange.reviewedAt", { date: new Date(request.reviewed_at).toLocaleString(i18n.language) })}</p>}
      {request.review_note && <p className="mt-3 break-words text-sm leading-6 text-gray-600 dark:text-gray-300">{t("pointsExchange.reviewNote", { note: request.review_note })}</p>}
      {children}
    </article>
  );
}
