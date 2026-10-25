"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { messages, UI_LOCALE_COOKIE, type UiLocale } from "./config";
const LocaleContext = createContext<((locale: UiLocale) => void) | null>(null);
export function UiLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: UiLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const changeLocale = (value: UiLocale) => {
    document.cookie = `${UI_LOCALE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setLocale(value);
  };
  return (
    <LocaleContext.Provider value={changeLocale}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
export function useUiLocaleChange() {
  const change = useContext(LocaleContext);
  if (!change) throw new Error("UiLocaleProvider is required");
  return change;
}
