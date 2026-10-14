import ComponentCard from "@/components/common/ComponentCard";
import Radio from "@/components/form/input/Radio";
import { cn } from "@/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function RadioButtons() {
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = useState<string>("option2");

  const handleRadioChange = (value: string) => {
    setSelectedValue(value);
  };
  return (
    <ComponentCard title={t("form.titles.radioButtons")}>
      <div className={cn("flex flex-wrap items-center gap-8")}>
        <Radio
          id="radio1"
          name="group1"
          value="option1"
          checked={selectedValue === "option1"}
          onChange={handleRadioChange}
          label={t("form.states.default")}
        />
        <Radio
          id="radio2"
          name="group1"
          value="option2"
          checked={selectedValue === "option2"}
          onChange={handleRadioChange}
          label={t("form.states.selected")}
        />
        <Radio
          id="radio3"
          name="group1"
          value="option3"
          checked={selectedValue === "option3"}
          onChange={handleRadioChange}
          label={t("form.states.disabled")}
          disabled={true}
        />
      </div>
    </ComponentCard>
  );
}

