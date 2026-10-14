import SignInForm from "@/components/auth/SignInForm";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";
import AuthLayout from "./AuthPageLayout";

export default function SignIn() {
  const { t } = useTranslation();
  return (
    <>
      <PageMeta
        title={t("signIn.pageTitle")}
        description={t("signIn.pageDescription")}
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
