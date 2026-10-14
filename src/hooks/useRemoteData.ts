import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorKey } from "@/lib/api";
import { createRemoteRefresh } from "@/lib/remote-refresh";
export default function useRemoteData<T>(load: () => Promise<T>, { pollIntervalMs = 0, revalidateOnFocus = false }: { pollIntervalMs?: number; revalidateOnFocus?: boolean } = {}) {
  const [state, setState] = useState<{ load: typeof load; data: T | null; error: string }>({ load, data: null, error: "" });
  const [refreshing, setRefreshing] = useState(false);
  const trigger = useRef<(() => Promise<void>) | null>(null);
  const refresh = useCallback(() => { void trigger.current?.(); }, []);
  useEffect(() => {
    const controller = createRemoteRefresh(load,
      (data) => setState({ load, data, error: "" }),
      (failure) => setState((previous) => ({ load, data: previous.load === load ? previous.data : null, error: apiErrorKey(failure) })),
      setRefreshing);
    trigger.current = controller.refresh;
    const revalidate = () => { if (document.visibilityState !== "hidden") void controller.refresh(); };
    if (revalidateOnFocus) {
      window.addEventListener("focus", revalidate);
      window.addEventListener("online", revalidate);
      document.addEventListener("visibilitychange", revalidate);
    }
    const timer = pollIntervalMs > 0 ? window.setInterval(() => { if (!controller.isRefreshing()) revalidate(); }, pollIntervalMs) : undefined;
    void controller.refresh();
    return () => {
      controller.dispose(); trigger.current = null;
      if (timer !== undefined) window.clearInterval(timer);
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [load, pollIntervalMs, revalidateOnFocus]);
  return { data: state.load === load ? state.data : null, error: state.load === load ? state.error : "", refresh, refreshing };
}
