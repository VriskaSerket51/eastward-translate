import { render } from "./web-render";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import IndexPage from "../src/views/index";
import { matchesView, textValue } from "../src/util/translations";

const { params, setParams } = vi.hoisted(() => ({
  params: new URLSearchParams({ path: "first.sq", lang: "ko" }),
  setParams: vi.fn(),
}));
vi.mock("@/hooks/use-search-params", () => ({
  useSearchParams: () => [params, setParams],
}));
vi.mock("@/layouts/default", () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("@heroui/button", () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    type = "button",
  }: {
    children: ReactNode;
    onPress?: () => void;
    isDisabled?: boolean;
    type?: "button" | "submit";
  }) => (
    <button type={type} onClick={onPress} disabled={isDisabled}>
      {children}
    </button>
  ),
}));
vi.mock("@heroui/radio", () => ({
  RadioGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Radio: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@heroui/checkbox", () => ({
  CheckboxGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Checkbox: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/util/translations", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../src/util/translations")>();
  return {
    ...original,
    matchesView: vi.fn(original.matchesView),
    textValue: vi.fn(original.textValue),
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
});

it("editing a translation leaves other rows and the file list unchanged", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const path = new URL(url, "http://localhost").pathname;
      const data =
        path === "/sq/names"
          ? ["first.sq", "second.sq"]
          : path === "/sq/languages"
            ? ["en", "ko"]
            : {
                csv: {
                  one: { en: "First", ko: "첫째" },
                  two: { en: "Second", ko: "둘째" },
                },
              };
      return Promise.resolve(
        new Response(JSON.stringify(data), { status: 200 }),
      );
    }),
  );
  render(<IndexPage />);
  await waitFor(() =>
    expect(screen.getByRole("textbox", { name: "ko one" })).toBeDefined(),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "first.sq" })).toBeDefined(),
  );
  vi.mocked(matchesView).mockClear();
  vi.mocked(textValue).mockClear();
  fireEvent.change(screen.getByRole("textbox", { name: "ko one" }), {
    target: { value: "수정" },
  });
  expect(
    (screen.getByRole("textbox", { name: "ko one" }) as HTMLTextAreaElement)
      .value,
  ).toBe("수정");
  expect(
    (screen.getByRole("textbox", { name: "ko two" }) as HTMLTextAreaElement)
      .value,
  ).toBe("둘째");
  expect(textValue).toHaveBeenCalled();
  expect(
    vi.mocked(textValue).mock.calls.every(([row]) => row.key === "one"),
  ).toBe(true);
  expect(matchesView).not.toHaveBeenCalled();
});
