import ComponentCard from "@/components/common/ComponentCard";
import FileInput from "@/components/form/input/FileInput";
import Label from "@/components/form/Label";
import { cn } from "@/utils";
import React from "react";
import { useTranslation } from "react-i18next";

export default function FileInputExample() {
  const { t } = useTranslation();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
    }
  };

  return (
    <ComponentCard title={t("form.titles.fileInput")}>
      <div>
        <Label>{t("form.labels.uploadFile")}</Label>
        <FileInput onChange={handleFileChange} className={cn("custom-class")} />
      </div>
    </ComponentCard>
  );
}
