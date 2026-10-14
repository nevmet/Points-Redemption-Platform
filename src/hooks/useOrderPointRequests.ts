import { useCallback } from "react";
import { listOrderPointRequests, type OrderPointsErrorCode } from "@/lib/api";
import type { OrderPointRequestRow } from "@/lib/database";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "./useRemoteData";
type Feed = { status: "loading" | "ready" | "error"; requests: OrderPointRequestRow[]; error?: OrderPointsErrorCode };
export default function useOrderPointRequests(forReview = false) {
  const { user } = useAuth();
  const load = useCallback(() => user ? listOrderPointRequests(forReview) : Promise.resolve([]), [user, forReview]);
  const { data, error, refresh } = useRemoteData(load, { pollIntervalMs: 5000, revalidateOnFocus: true });
  const feed: Feed = { status: error ? "error" : data ? "ready" : "loading", requests: data || [], error: "failed" };
  return { feed, refresh, upsert: (request: OrderPointRequestRow) => { void request; refresh(); } };
}
