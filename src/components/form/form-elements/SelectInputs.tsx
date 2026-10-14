import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import MultiSelect from "@/components/form/MultiSelect";
import Select from "@/components/form/Select";
import { cn } from "@/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function SelectInputs() {
  const { t } = useTranslation();
  const options = [
    { value: "marketing", label: t("form.options.marketing") },
    { value: "template", label: t("form.options.template") },
    { value: "development", label: t("form.options.development") },
  ];
  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const multiOptions = [
    { value: "1", text: t("form.options.optionNumber", { number: 1 }), selected: false },
    { value: "2", text: t("form.options.optionNumber", { number: 2 }), selected: false },
    { value: "3", text: t("form.options.optionNumber", { number: 3 }), selected: false },
    { value: "4", text: t("form.options.optionNumber", { number: 4 }), selected: false },
    { value: "5", text: t("form.options.optionNumber", { number: 5 }), selected: false },
  ];
  return (
    <ComponentCard title={t("form.titles.selectInputs")}>
      <div className={cn("space-y-6")}>
        <div>
          <Label>{t("form.labels.selectInput")}</Label>
          <Select
            options={options}
            placeholder={t("form.placeholders.selectOption")}
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div>
          <MultiSelect
            label={t("form.labels.multipleSelectOptions")}
            options={multiOptions}
            defaultSelected={["1", "3"]}
            onChange={(values) => setSelectedValues(values)}
          />
          <p className="sr-only">
            {t("form.selectedValues", { values: selectedValues.join(", ") })}
          </p>
        </div>
      </div>
    </ComponentCard>
  );
}

