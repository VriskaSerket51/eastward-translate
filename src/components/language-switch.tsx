import { useLocale, useTranslations } from "next-intl";
import { useUiLocaleChange } from "@/i18n/provider";
import { isUiLocale } from "@/i18n/config";
export function LanguageSwitch() {
  const locale = useLocale();
  const t = useTranslations("Nav");
  const change = useUiLocaleChange();
  return (
    <select
      className="ui-language-select"
      aria-label={t("uiLanguage")}
      value={locale}
      onChange={(event) => {
        if (isUiLocale(event.target.value)) change(event.target.value);
      }}
    >
      <option value="en">English</option>
      <option value="ko">한국어</option>
    </select>
  );
}
