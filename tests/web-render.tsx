import {
  render as renderView,
  type RenderOptions,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { messages } from "../src/i18n/config";
export function EnglishUi({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages.en} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
export function render(view: ReactElement, options?: RenderOptions) {
  return renderView(view, { wrapper: EnglishUi, ...options });
}
