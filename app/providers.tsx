"use client";
import { UiLocaleProvider } from "@/i18n/provider";
import type { UiLocale } from "@/i18n/config";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: UiLocale;
}) {
  const router = useRouter();
  return (
    <UiLocaleProvider initialLocale={locale}>
      <HeroUIProvider navigate={(href) => router.push(href)}>
        {children}
      </HeroUIProvider>
    </UiLocaleProvider>
  );
}
