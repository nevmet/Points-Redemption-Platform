import type { AppUser } from "./auth-types";
import type { OrderPointRequestRow, PointTransactionRow, RedemptionRequestRow } from "./database";

export type CustomerNotification = {
  id: string;
  titleKey: string;
  values: { points?: number };
  detail: string;
  note?: string;
  transaction?: PointTransactionRow;
  date: string;
  href: string;
};

// Existing authenticated endpoints scope data on the server; filter again here
// so an old response or a privileged session can never populate another user's feed.
export function customerNotifications(user: AppUser, transactions: PointTransactionRow[], orders: OrderPointRequestRow[], gifts: RedemptionRequestRow[]): CustomerNotification[] {
  const emailMatches = (email: string) => Boolean(user.email) && email.toLowerCase() === user.email.toLowerCase();
  const items: CustomerNotification[] = [];
  for (const row of transactions) {
    if (row.customer_id ? row.customer_id !== user.id : !emailMatches(row.customer_email)) continue;
    items.push({ id: "points:" + row.id, titleKey: row.refund_redemption_id ? "points_refund" : "points_" + row.type, values: { points: row.points }, detail: row.description, note: orders.find(order => order.customer_id === user.id && order.id === row.order_point_request_id)?.review_note, transaction: row, date: row.created_at, href: "/points-exchange" });
  }
  const credited = new Set(transactions.filter(row => row.customer_id === user.id && row.type === "credit").map(row => row.order_point_request_id));
  for (const row of orders) {
    if (row.customer_id !== user.id) continue;
    if (row.status === "approved" && credited.has(row.id)) continue;
    const date = row.reviewed_at || row.created_at;
    items.push({ id: ["order", row.id, row.status, date, row.order_number].join(":"), titleKey: "order_" + row.status, values: {}, detail: row.order_number, note: row.review_note, date, href: "/points-exchange" });
  }
  for (const row of gifts) {
    if (!emailMatches(row.customer_email)) continue;
    const date = row.updated_at || row.created_at;
    items.push({ id: ["gift", row.id, row.status, date].join(":"), titleKey: "gift_" + row.status, values: {}, note: row.resolution_note, detail: [row.product_name, row.request_code].filter(Boolean).join(" · "), date, href: "/redemptions" });
  }
  return [...new Map(items.map((item) => [item.id, item])).values()].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

export function notificationReadKey(userId: string) {
  return "bags-star:notifications-read:" + userId;
}
