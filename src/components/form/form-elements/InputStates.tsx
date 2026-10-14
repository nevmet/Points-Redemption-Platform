import ComponentCard from "@/components/common/ComponentCard";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { cn } from "@/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function InputStates() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailTwo, setEmailTwo] = useState("");
  const [error, setError] = useState(false);

  // Simulate a validation check
  const validateEmail = (value: string) => {
    const isValidEmail =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    setError(!isValidEmail);
    return isValidEmail;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };
  const handleEmailTwoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailTwo(value);
    validateEmail(value);
  };
  return (
    <ComponentCard
      title={t("form.titles.inputStates")}
      desc={t("form.inputStates.description")}
    >
      <div className={cn("space-y-5 sm:space-y-6")}>
        {/* Error Input */}
        <div>
          <Label>{t("form.labels.email")}</Label>
          <Input
            type="email"
            value={email}
            error={error}
            onChange={handleEmailChange}
            placeholder={t("form.placeholders.enterYourEmail")}
            hint={error ? t("form.hints.invalidEmail") : ""}
          />
        </div>

        {/* Success Input */}
        <div>
          <Label>{t("form.labels.email")}</Label>
          <Input
            type="email"
            value={emailTwo}
            success={!error}
            onChange={handleEmailTwoChange}
            placeholder={t("form.placeholders.enterYourEmail")}
            hint={!error ? t("form.hints.successMessage") : ""}
          />
        </div>

        {/* Disabled Input */}
        <div>
          <Label>{t("form.labels.email")}</Label>
          <Input
            type="text"
            value="disabled@example.com"
            disabled={true}
            placeholder={t("form.placeholders.disabledEmail")}
          />
        </div>
      </div>
    </ComponentCard>
  );
}

