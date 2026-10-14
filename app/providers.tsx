"use client";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <HeroUIProvider navigate={(href) => router.push(href)}>
      {children}
    </HeroUIProvider>
  );
}
