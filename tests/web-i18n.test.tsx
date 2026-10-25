import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { UiLocaleProvider } from "../src/i18n/provider";
import { LanguageSwitch } from "../src/components/language-switch";
import {
  messages,
  resolveUiLocale,
  UI_LOCALE_COOKIE,
} from "../src/i18n/config";
import IndexPage from "../src/views/index";

const { params, setParams } = vi.hoisted(() => ({
  params: new URLSearchParams({ path: "first.sq", lang: "fr" }),
  setParams: vi.fn(),
}));
vi.mock("@/hooks/use-search-params", () => ({
  useSearchParams: () => [params, setParams],
}));
vi.mock("@/layouts/default", () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
  document.cookie = `${UI_LOCALE_COOKIE}=; Max-Age=0; Path=/`;
  document.documentElement.lang = "en";
});
it("detects UI language independently of translation languages and respects the saved preference", () => {
  expect(resolveUiLocale(undefined, "ko-KR, en;q=0.8")).toBe("ko");
  expect(resolveUiLocale("en", "ko-KR")).toBe("en");
  expect(resolveUiLocale("fr", "fr-FR,ko;q=0.7")).toBe("ko");
  expect(resolveUiLocale(undefined, "ja, en-US;q=0.9, ko;q=0.5")).toBe("en");
  expect(resolveUiLocale(undefined, "ko;q=0,en;q=0.5")).toBe("en");
  expect(resolveUiLocale(undefined, "fr-FR")).toBe("en");
  expect(resolveUiLocale(undefined, "ko;q=invalid")).toBe("en");
});
it("has matching English and Korean message keys and renders count messages", () => {
  for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
    expect(Object.keys(messages.ko[key]).sort()).toEqual(
      Object.keys(messages.en[key]).sort(),
    );
  }
  const en = createTranslator({ locale: "en", messages: messages.en });
  const ko = createTranslator({ locale: "ko", messages: messages.ko });
  expect(en("History.versions", { count: 1 })).toBe("1 version");
  expect(en("History.versions", { count: 2 })).toBe("2 versions");
  expect(ko("History.versions", { count: 2 })).toBe("버전 2개");
});
it("switches the UI without remounting the editor, changing its target or losing its draft", async () => {
  const fetch = vi.fn((input: string) => {
    const url = new URL(input, "http://localhost");
    const data =
      url.pathname === "/sq/names"
        ? ["first.sq"]
        : url.pathname === "/sq/languages"
          ? ["en", "fr", "ko"]
          : { csv: { one: { en: "Hello", fr: "Bonjour" } } };
    return Promise.resolve(new Response(JSON.stringify(data)));
  });
  vi.stubGlobal("fetch", fetch);
  render(
    <UiLocaleProvider initialLocale="en">
      <LanguageSwitch />
      <IndexPage />
    </UiLocaleProvider>,
  );
  const input = (await screen.findByRole("textbox", {
    name: "fr one",
  })) as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "Brouillon" } });
  const requestCount = fetch.mock.calls.length;
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Interface language" }),
    "ko",
  );
  expect(screen.getByLabelText("번역 대상 언어").getAttribute("value")).toBe(
    "fr",
  );
  expect(screen.getByRole("textbox", { name: "fr one" })).toBe(input);
  expect(input.value).toBe("Brouillon");
  expect(
    screen.getByRole("link", { name: "JSON 내보내기" }).getAttribute("href"),
  ).toContain("lang=fr");
  expect(screen.getByRole("button", { name: /저장/ })).toBeDefined();
  expect(document.cookie).toContain(`${UI_LOCALE_COOKIE}=ko`);
  await waitFor(() => expect(document.documentElement.lang).toBe("ko"));
  expect(fetch).toHaveBeenCalledTimes(requestCount);
  expect(setParams).not.toHaveBeenCalled();
  expect(localStorage.getItem("eastward-translate-drafts-v1")).toContain(
    "Brouillon",
  );
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "화면 언어" }),
    "en",
  );
  expect(screen.getByRole("textbox", { name: "fr one" })).toBe(input);
  expect(input.value).toBe("Brouillon");
  expect(document.cookie).toContain(`${UI_LOCALE_COOKIE}=en`);
});
