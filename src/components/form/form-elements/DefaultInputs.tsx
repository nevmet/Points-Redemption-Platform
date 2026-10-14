import ComponentCard from "@/components/common/ComponentCard";
import DatePicker from "@/components/form/date-picker";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import { EyeCloseIcon, EyeIcon, TimeIcon } from "@/icons";
import { cn } from "@/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function DefaultInputs() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const options = [
    { value: "marketing", label: t("form.options.marketing") },
    { value: "template", label: t("form.options.template") },
    { value: "development", label: t("form.options.development") },
  ];
  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };

  return (
    <ComponentCard title={t("form.titles.defaultInputs")}>
      <div className={cn("space-y-6")}>
        <div>
          <Label htmlFor="input">{t("form.labels.input")}</Label>
          <Input type="text" id="input" />
        </div>
        <div>
          <Label htmlFor="inputTwo">{t("form.labels.inputWithPlaceholder")}</Label>
          <Input type="text" id="inputTwo" placeholder="info@gmail.com" />
        </div>
        <div>
          <Label>{t("form.labels.selectInput")}</Label>
          <Select
            options={options}
            placeholder={t("form.placeholders.selectAnOption")}
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div>
          <Label>{t("form.labels.passwordInput")}</Label>
          <div className={cn("relative")}>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("form.placeholders.enterYourPassword")}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className={cn("absolute end-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer")}
              type="button"
              aria-label={
                showPassword ? t("form.password.hide") : t("form.password.show")
              }
            >
              {showPassword ? (
                <EyeIcon className={cn("size-5 fill-gray-500 dark:fill-gray-400")} />
              ) : (
                <EyeCloseIcon className={cn("size-5 fill-gray-500 dark:fill-gray-400")} />
              )}
            </button>
          </div>
        </div>

        <div>
          <DatePicker
            id="date-picker"
            label={t("form.labels.datePickerInput")}
            placeholder={t("form.placeholders.selectDate")}
            onChange={(dates, currentDateString) => {
              // Handle your logic
              console.log({ dates, currentDateString });
            }}
          />
        </div>

        <div>
          <Label htmlFor="tm">{t("form.labels.timePickerInput")}</Label>
          <div className={cn("relative")}>
            <Input
              type="time"
              id="tm"
              name="tm"
              onChange={(e) => console.log(e.target.value)}
            />
            <span className={cn("pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400")}>
              <TimeIcon className={cn("size-6")} />
            </span>
          </div>
        </div>
        <div>
          <Label htmlFor="card-payment">{t("form.labels.inputWithPayment")}</Label>
          <div className={cn("relative")}>
            <Input
              id="card-payment"
              type="text"
              placeholder={t("form.placeholders.cardNumber")}
              className="ps-[62px]"
            />
            <span className={cn("absolute start-0 top-1/2 flex h-11 w-[46px] -translate-y-1/2 items-center justify-center border-e border-gray-200 dark:border-gray-800")}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="6.25" cy="10" r="5.625" fill="#E80B26" />
                <circle cx="13.75" cy="10" r="5.625" fill="#F59D31" />
                <path
                  d="M10 14.1924C11.1508 13.1625 11.875 11.6657 11.875 9.99979C11.875 8.33383 11.1508 6.8371 10 5.80713C8.84918 6.8371 8.125 8.33383 8.125 9.99979C8.125 11.6657 8.84918 13.1625 10 14.1924Z"
                  fill="#FC6020"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}

