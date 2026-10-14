import type { Metadata } from "next";
import { Providers } from "./providers";
import "../src/styles/globals.css";
export const metadata: Metadata = {
  title: "Eastward Translate",
  description: "Eastward translation editor",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
