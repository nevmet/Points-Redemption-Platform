import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useModal } from "@/hooks/useModal";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { PencilIcon } from "@/icons";

export default function Security() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [saved, setSaved] = useState(false);

  return (
    <div className="mb-6 rounded-2xl border border-gray-200  p-5 lg:p-6 dark:border-gray-800 ">
      <h4 className="text-lg mb-4 font-semibold text-gray-800 lg:mb-6 dark:text-white/90">
        {t("userProfile.security")}
      </h4>
      {saved && <p role="status" className="mb-4 rounded-lg bg-success-50 p-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">{t("passwordChange.success")}</p>}
      {isOpen && <ChangePasswordDialog onClose={closeModal} onSaved={() => { closeModal(); setSaved(true); }} />}
      <div>
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-end dark:border-gray-800">
          <div>
            <span className="block text-base mb-1 font-medium text-gray-800 dark:text-white/90">
              {t("userProfile.changePassword")}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("userProfile.securityPasswordDesc")}
            </p>
          </div>
          <div>
            <button type="button" onClick={() => { setSaved(false); openModal(); }} className="shadow-theme-xs flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 pe-4 ps-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200">
              <PencilIcon className="size-5" aria-hidden="true" />
              {t("userProfile.changePassword")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
