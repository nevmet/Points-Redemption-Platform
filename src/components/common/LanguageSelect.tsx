import { useLanguage } from "@/context/LanguageContext";
import { languages } from "@/i18n/languages";
import { ChevronDownIcon, GlobeIcon } from "@/icons";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSelect() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const id = useId();

  return (
    <div className="relative ms-auto w-36 shrink-0">
      <label htmlFor={id} className="sr-only">
        {t("userDropdown.language")}
      </label>
      <GlobeIcon
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
      />
      <select
        id={id}
        value={language}
        onChange={(event) => {
          const selected = languages.find((item) => item.id === event.target.value);
          if (selected) setLanguage(selected.id);
        }}
        className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-2.5 ps-9 pe-8 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-brand-800"
      >
        {languages.map((item) => (
          <option key={item.id} value={item.id} lang={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
      />
    </div>
  );
}
