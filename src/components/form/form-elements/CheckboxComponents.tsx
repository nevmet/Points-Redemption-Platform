import ComponentCard from "@/components/common/ComponentCard";
import Checkbox from "@/components/form/input/Checkbox";
import { cn } from "@/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function CheckboxComponents() {
  const { t } = useTranslation();
  const [isChecked, setIsChecked] = useState(false);
  const [isCheckedTwo, setIsCheckedTwo] = useState(true);
  const [isCheckedDisabled, setIsCheckedDisabled] = useState(false);
  return (
    <ComponentCard title={t("form.titles.checkbox")}>
      <div className={cn("flex items-center gap-4")}>
        <div className={cn("flex items-center gap-3")}>
          <Checkbox checked={isChecked} onChange={setIsChecked} />
          <span className={cn("block text-sm font-medium text-gray-700 dark:text-gray-400")}>
            {t("form.states.default")}
          </span>
        </div>
        <div className={cn("flex items-center gap-3")}>
          <Checkbox
            checked={isCheckedTwo}
            onChange={setIsCheckedTwo}
            label={t("form.states.checked")}
          />
        </div>
        <div className={cn("flex items-center gap-3")}>
          <Checkbox
            checked={isCheckedDisabled}
            onChange={setIsCheckedDisabled}
            disabled
            label={t("form.states.disabled")}
          />
        </div>
      </div>
    </ComponentCard>
  );
}

