import { useTranslation } from "react-i18next";
import { cn } from "@/utils";

interface BrandLogoProps {
  compact?: boolean;
  size?: "sm" | "md";
}

export default function BrandLogo({ compact = false, size = "md" }: BrandLogoProps) {
  const { t } = useTranslation();

  return (
    <span className={cn("inline-flex shrink-0 items-center", size === "sm" ? "gap-2.5" : "gap-3")}>
      <img
        src="/images/logo/star-mark.png"
        alt={t("brand.logoAlt")}
        width={48}
        height={48}
        className={cn("shrink-0 object-contain dark:brightness-0 dark:invert", size === "sm" ? "size-10" : "size-12")}
      />
      {!compact && (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("whitespace-nowrap font-semibold tracking-widest text-gray-900 dark:text-white", size === "sm" ? "text-sm" : "text-base")}>
            {t("brand.name")}
          </span>
          <span className="whitespace-nowrap text-theme-xs font-medium tracking-wide text-gray-500 dark:text-gray-400">
            {t("sidebar.rewardsHub")}
          </span>
        </span>
      )}
    </span>
  );
}
