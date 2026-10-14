// Serialize refreshes so a slow older response cannot replace a newer balance.
export function createRemoteRefresh<T>(load: () => Promise<T>, onData: (data: T) => void, onError: (error: unknown) => void, onBusy: (busy: boolean) => void) {
  let active = true;
  let running = false;
  let queued = false;
  const refresh = async () => {
    if (!active) return;
    if (running) { queued = true; return; }
    running = true; onBusy(true);
    do {
      queued = false;
      try { const value = await load(); if (active && !queued) onData(value); }
      catch (error) { if (active && !queued) onError(error); }
    } while (active && queued);
    running = false;
    if (active) onBusy(false);
  };
  return { refresh, isRefreshing: () => running, dispose: () => { active = false; } };
}
