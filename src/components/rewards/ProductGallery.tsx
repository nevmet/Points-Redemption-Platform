import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon } from "@/icons";

export default function ProductGallery({ images, name, children }: { images: string[]; name: string; children?: ReactNode }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const count = images.length;
  const current = count ? index % count : 0;
  useEffect(() => {
    if (!hovered || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % count), 1800);
    return () => window.clearInterval(timer);
  }, [hovered, count]);
  const choose = (value: number) => { setHovered(false); setIndex((value + count) % count); };
  return <div role="group" aria-label={t("productGallery.label", { name })} className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800"
    onPointerEnter={(event) => { if (event.pointerType === "mouse" && count > 1) { setHovered(true); if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setIndex(1); } }}
    onPointerLeave={() => { setHovered(false); setIndex(0); }}>
    {count ? <img src={images[current]} alt={t("productGallery.image", { name, number: current + 1, count })} loading="lazy" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">{t("productGallery.empty")}</div>}
    {children}
    {count > 1 && <>
      <span className="absolute end-3 top-3 rounded-full bg-gray-950/65 px-2 py-1 text-xs text-white">{current + 1} / {count}</span>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2" onFocus={() => setHovered(false)}>
        <button type="button" aria-label={t("productGallery.previous")} onClick={() => choose(current - 1)} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-theme-xs hover:bg-brand-50 dark:bg-gray-900/95 dark:text-white"><ChevronLeftIcon className="size-5 rtl:rotate-180" /></button>
        <div className="flex rounded-full bg-gray-950/65 px-1">{images.map((url, imageIndex) => <button key={`${url}-${imageIndex}`} type="button" aria-label={t("productGallery.goTo", { number: imageIndex + 1 })} aria-pressed={current === imageIndex} onPointerEnter={() => choose(imageIndex)} onClick={() => choose(imageIndex)} className="flex size-6 items-center justify-center rounded-full"><span className={`size-1.5 rounded-full ${current === imageIndex ? "bg-white" : "bg-white/40"}`} /></button>)}</div>
        <button type="button" aria-label={t("productGallery.next")} onClick={() => choose(current + 1)} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-theme-xs hover:bg-brand-50 dark:bg-gray-900/95 dark:text-white"><ChevronLeftIcon className="size-5 rotate-180 rtl:rotate-0" /></button>
      </div>
    </>}
  </div>;
}
