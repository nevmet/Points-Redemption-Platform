import SignUpForm from "@/components/auth/SignUpForm";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";
import AuthLayout from "./AuthPageLayout";

export default function SignUp() {
  const { t } = useTranslation();
  return <>
    <PageMeta title={t("signUp.pageTitle")} description={t("signUp.pageDescription")} />
    <AuthLayout>{onInteraction => <SignUpForm onInteraction={onInteraction} />}</AuthLayout>
  </>;
}
