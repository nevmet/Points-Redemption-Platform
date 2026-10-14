import ComponentCard from "@/components/common/ComponentCard";
import Switch from "@/components/form/switch/Switch";
import { cn } from "@/utils";
import { useTranslation } from "react-i18next";

export default function ToggleSwitch() {
  const { t } = useTranslation();
  const handleSwitchChange = (checked: boolean) => {
    console.log("Switch is now:", checked ? "ON" : "OFF");
  };
  return (
    <ComponentCard title={t("form.titles.toggleSwitch")}>
      <div className={cn("flex flex-wrap gap-4")}>
        <Switch
          label={t("form.states.default")}
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch
          label={t("form.states.checked")}
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch label={t("form.states.disabled")} disabled={true} />
      </div>
      <div className={cn("mt-4 flex flex-wrap gap-4")}>
        <Switch
          label={t("form.states.default")}
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch
          label={t("form.states.checked")}
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch label={t("form.states.disabled")} disabled={true} color="gray" />
      </div>
    </ComponentCard>
  );
}

