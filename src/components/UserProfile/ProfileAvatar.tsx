import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ProfileAvatar({ url, name }: { url?: string | null; name: string }) {
  return <AvatarImage key={url || "initial"} url={url} name={name} />;
}
function AvatarImage({ url, name }: { url?: string | null; name: string }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  return url && !failed
    ? <img src={url} alt={t("profileAvatar.label")} onError={() => setFailed(true)} className="h-full w-full rounded-full object-cover" />
    : <span aria-label={t("profileAvatar.label")} className="flex h-full w-full items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{name.slice(0, 1).toUpperCase() || "?"}</span>;
}
