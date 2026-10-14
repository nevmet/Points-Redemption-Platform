import { useTranslation } from "react-i18next";

export default function ResponsiveImage() {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <div className="overflow-hidden">
        <img
          src="/images/grid-image/image-01.png"
          alt={t("image.cover")}
          className="w-full border border-gray-200 rounded-xl dark:border-gray-800"
        />
      </div>
    </div>
  );
}
