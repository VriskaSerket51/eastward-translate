import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { messages, resolveUiLocale, UI_LOCALE_COOKIE } from "./config";
export default getRequestConfig(async () => {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);
  const locale = resolveUiLocale(
    cookieStore.get(UI_LOCALE_COOKIE)?.value,
    requestHeaders.get("accept-language") ?? "",
  );
  return { locale, messages: messages[locale], timeZone: "UTC" };
});
