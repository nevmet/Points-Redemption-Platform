import ComponentCard from "@/components/common/ComponentCard";
import TextArea from "@/components/form/input/TextArea";
import Label from "@/components/form/Label";
import { cn } from "@/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function TextAreaInput() {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [messageTwo, setMessageTwo] = useState("");
  return (
    <ComponentCard title={t("form.titles.textarea")}>
      <div className={cn("space-y-6")}>
        {/* Default TextArea */}
        <div>
          <Label>{t("form.labels.description")}</Label>
          <TextArea
            value={message}
            onChange={(value) => setMessage(value)}
            rows={6}
          />
        </div>

        {/* Disabled TextArea */}
        <div>
          <Label>{t("form.labels.description")}</Label>
          <TextArea rows={6} disabled />
        </div>

        {/* Error TextArea */}
        <div>
          <Label>{t("form.labels.description")}</Label>
          <TextArea
            rows={6}
            value={messageTwo}
            error
            onChange={(value) => setMessageTwo(value)}
            hint={t("form.hints.validMessage")}
          />
        </div>
      </div>
    </ComponentCard>
  );
}

