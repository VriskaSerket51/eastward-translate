import { getLocale } from "next-intl/server";
import { isUiLocale } from "@/i18n/config";
import type { Metadata } from "next";
import { Providers } from "./providers";
import "../src/styles/globals.css";
export const metadata: Metadata = {
  title: "Eastward Translate",
  description: "Eastward translation editor",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={isUiLocale(locale) ? locale : "en"}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
