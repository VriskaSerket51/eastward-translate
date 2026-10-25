import en from "../../messages/en.json";
import ko from "../../messages/ko.json";
export const messages = { en, ko };
export type UiLocale = keyof typeof messages;
export const UI_LOCALE_COOKIE = "eastward-ui-locale";
export function isUiLocale(value: unknown): value is UiLocale {
  return value === "en" || value === "ko";
}
export function resolveUiLocale(saved: unknown, acceptLanguage = ""): UiLocale {
  if (isUiLocale(saved)) return saved;
  const preferences = acceptLanguage
    .split(",")
    .map((entry) => {
      const [tag, ...options] = entry.trim().split(";");
      const weight = options.find((option) => option.trim().startsWith("q="));
      return {
        locale: tag.toLowerCase().split("-")[0],
        quality: weight ? Number(weight.trim().slice(2)) : 1,
      };
    })
    .filter(
      (item) =>
        Number.isFinite(item.quality) && item.quality > 0 && item.quality <= 1,
    )
    .sort((a, b) => b.quality - a.quality);
  const match = preferences.find((item) => isUiLocale(item.locale));
  return match && isUiLocale(match.locale) ? match.locale : "en";
}
