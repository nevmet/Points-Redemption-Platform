import type { CustomerSummary, OrderPointRequestRow } from "./database";

export type OrderRequestGroup = {
  id: string;
  username: string;
  email: string;
  requests: OrderPointRequestRow[];
  pending: number;
  approved: number;
  rejected: number;
};

export function groupOrderRequests(customers: CustomerSummary[], requests: OrderPointRequestRow[]): OrderRequestGroup[] {
  const groups = new Map<string, OrderRequestGroup>(customers.map((customer) => [customer.id, {
    id: customer.id, username: customer.username, email: customer.email, requests: [], pending: 0, approved: 0, rejected: 0,
  }]));
  for (const request of requests) {
    // Keep historical applicants visible even if absent from the current customer directory.
    const group = groups.get(request.customer_id) || {
      id: request.customer_id, username: request.customer_email, email: request.customer_email, requests: [], pending: 0, approved: 0, rejected: 0,
    };
    group.requests.push(request);
    group[request.status] += 1;
    groups.set(group.id, group);
  }
  for (const group of groups.values()) group.requests.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return [...groups.values()].sort((a, b) => b.pending - a.pending || a.username.localeCompare(b.username) || a.id.localeCompare(b.id));
}
