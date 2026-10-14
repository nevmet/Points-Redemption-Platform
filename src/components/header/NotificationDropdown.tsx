import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { BellAltIcon, CloseIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";
import useRemoteData from "@/hooks/useRemoteData";
import { listMyNotificationFeed, markMyNotificationsRead } from "@/lib/api";
import { customerNotifications, notificationReadKey } from "@/lib/customer-notifications";
import { pointDescription } from "@/lib/product-specification-display";
import type { AppUser } from "@/lib/auth-types";
import { Dropdown } from "../ui/dropdown/Dropdown";

export default function NotificationDropdown() {
  const { user } = useAuth();
  // Remount on account changes, including the read state and open dropdown.
  return user ? <UserNotifications key={user.id} user={user} /> : null;
}

function UserNotifications({ user }: { user: AppUser }) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(notificationReadKey(user.id)) || "[]");
      return new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
    } catch { return new Set(); }
  });
  const load = useCallback(async () => {
    const feed = await listMyNotificationFeed();
    return { items: customerNotifications(user, feed.transactions, feed.orders, feed.gifts).slice(0, 50), readIds: feed.readIds };
  }, [user]);
  const { data: feed, error, refresh } = useRemoteData(load, { pollIntervalMs: isOpen ? 15000 : 60000, revalidateOnFocus: true });
  const data = feed?.items;
  const [readError, setReadError] = useState(false);
  const [marking, setMarking] = useState(false);
  const seenIds = new Set([...readIds, ...(feed?.readIds || [])]);
  const unread = (data || []).filter((item) => !seenIds.has(item.id)).length;
  const markRead = async (ids: string[]) => {
    if (marking) return; setMarking(true); setReadError(false);
    try {
      const saved = await markMyNotificationsRead([...seenIds, ...ids]);
      setReadIds(new Set(saved));
      try { localStorage.setItem(notificationReadKey(user.id), JSON.stringify(saved)); } catch { /* optional cache */ }
    } catch { setReadError(true); }
    finally { setMarking(false); }
  };
  const close = () => setIsOpen(false);
  return <div className="relative">
    <button type="button" aria-label={t("header.notifications.title")} aria-expanded={isOpen} onClick={() => { setIsOpen(!isOpen); if (!isOpen) refresh(); }} className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800">
      <BellAltIcon className="size-5" aria-hidden="true" />
      {unread > 0 && <span aria-label={t("header.notifications.unread", { count: unread })} className="absolute end-0 top-0 h-2.5 w-2.5 rounded-full bg-orange-400" />}
    </button>
    <Dropdown isOpen={isOpen} onClose={close} className="fixed start-4 end-4 top-32 mt-4 flex max-h-120 w-auto sm:absolute sm:start-auto sm:end-0 sm:top-auto sm:w-96 max-w-[calc(100vw-2rem)] flex-col rounded-2xl p-3 shadow-theme-lg sm:w-96">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("header.notifications.title")}</h2>
        <button type="button" aria-label={t("header.notifications.close")} onClick={close} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"><CloseIcon className="size-5" aria-hidden="true" /></button>
      </div>
      <div className="flex items-center justify-between gap-3 py-3 text-xs">
        <span className="text-gray-500 dark:text-gray-400">{t("header.notifications.ownOnly")}</span>
        <button type="button" disabled={!unread || marking} onClick={() => void markRead((data || []).map((item) => item.id))} className="shrink-0 text-brand-600 disabled:opacity-40 dark:text-brand-400">{t("header.notifications.markAllRead")}</button>
      </div>
      {readError && <p role="alert" className="text-sm text-error-600 dark:text-error-400">{t("portalFixes.readFailed")}</p>}
      {error && <div role="alert" className="mb-2 text-sm text-error-600 dark:text-error-400">{t(error)} <button type="button" onClick={refresh} className="underline">{t("header.notifications.retry")}</button></div>}
      {!data && !error && <p role="status" className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("header.notifications.loading")}</p>}
      {data?.length === 0 && <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{t("header.notifications.empty")}</p>}
      <ul className="custom-scrollbar min-h-0 overflow-y-auto">
        {data?.map((item) => <li key={item.id} className="border-t border-gray-100 first:border-0 dark:border-gray-800">
          <Link to={item.href} onClick={() => { void markRead([item.id]); close(); }} className={"block rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-800 " + (!readIds.has(item.id) ? "bg-brand-25 dark:bg-brand-500/10" : "")}>
            <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("header.notifications." + item.titleKey, { ...item.values, points: item.values.points?.toLocaleString(i18n.language) })}</p>{!readIds.has(item.id) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}</div>
            <p className="mt-1 break-words text-sm text-gray-600 dark:text-gray-300">{item.transaction ? pointDescription(item.transaction, t, i18n.language) : item.detail}</p>
            {item.note && <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400">{t("header.notifications.reviewNote", { note: item.note })}</p>}
            <time dateTime={item.date} className="mt-2 block text-xs text-gray-500 dark:text-gray-400">{new Date(item.date).toLocaleString(i18n.language)}</time>
          </Link>
        </li>)}
      </ul>
      <div className="flex justify-between border-t border-gray-100 pt-3 text-xs text-brand-600 dark:border-gray-800 dark:text-brand-400"><Link onClick={close} to="/points-exchange">{t("pointsLedger.title")}</Link><Link onClick={close} to="/redemptions">{t("redemptions.title")}</Link></div>
    </Dropdown>
  </div>;
}
