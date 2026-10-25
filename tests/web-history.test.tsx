import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { changedText } from "../src/util/history";
import HistoryPage from "../src/views/history";

const { params, setParams } = vi.hoisted(() => ({
  params: new URLSearchParams({ lang: "ko" }),
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
  params.delete("path");
  params.set("lang", "ko");
});
const editedDate = 1726740805758;
const history = [{ path: "story/demo.sq", editor: "translator", editedDate }];
const versions = {
  one: [
    {
      id: 3,
      key: "one",
      value: "수정한 번역",
      editor: "translator",
      editedDate,
    },
    { id: 2, key: "one", value: "", editor: "previous", editedDate },
    { id: 1, key: "one", value: "원래 번역", editor: null, editedDate },
  ],
};
function mockApi(list: unknown = history, diff: unknown = versions) {
  const fetch = vi.fn((input: string) => {
    const url = new URL(input, "http://localhost");
    return Promise.resolve(
      new Response(
        JSON.stringify(url.pathname === "/sq/history" ? list : diff),
      ),
    );
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
it("shows an empty history message and a file selection hint", async () => {
  mockApi([]);
  render(<HistoryPage />);
  expect(await screen.findByText("No edits yet for ko.")).toBeDefined();
  expect(screen.getByText("Select a file to view its edits.")).toBeDefined();
  expect(screen.queryByText("Loading history...")).toBeNull();
});
it("opens a history file and displays its editor, original and saved versions", async () => {
  const fetch = mockApi();
  const view = render(<HistoryPage />);
  await userEvent.click(
    await screen.findByRole("button", { name: /story\/demo.sq/ }),
  );
  expect(setParams).toHaveBeenCalledWith({ path: "story/demo.sq", lang: "ko" });
  params.set("path", "story/demo.sq");
  view.rerender(<HistoryPage />);
  expect((await screen.findAllByText("수정한 번역")).length).toBeGreaterThan(0);
  expect(screen.getByText("원래 번역")).toBeDefined();
  expect(screen.getByText("Original")).toBeDefined();
  expect(screen.getAllByText("(Empty translation)").length).toBeGreaterThan(0);
  expect(screen.getByText(/Edited by translator at/)).toBeDefined();
  expect(
    screen
      .getByRole("button", { name: /story\/demo.sq/ })
      .getAttribute("aria-current"),
  ).toBe("true");
  const diffCall = fetch.mock.calls.find(([url]) => url.startsWith("/sq/diff"));
  expect(
    new URL(diffCall![0], "http://localhost").searchParams.get("path"),
  ).toBe("story/demo.sq");
  expect(screen.queryByText("No edits found for this file in ko.")).toBeNull();
});
it("shows an empty detail for a selected file without edits", async () => {
  params.set("path", "story/demo.sq");
  mockApi(history, {});
  render(<HistoryPage />);
  await waitFor(() =>
    expect(screen.queryByText("Loading edits...")).toBeNull(),
  );
  expect(screen.getByText("No edits found for this file in ko.")).toBeDefined();
});
it("shows failed requests as errors rather than empty history", async () => {
  params.set("path", "story/demo.sq");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response("Unavailable", { status: 503 }))),
  );
  render(<HistoryPage />);
  await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
  expect(screen.queryByText("Loading history...")).toBeNull();
  expect(screen.queryByText("No edits yet for ko.")).toBeNull();
  expect(screen.queryByText("No edits found for this file in ko.")).toBeNull();
});
it("ignores an old detail response after selecting a different file", async () => {
  params.set("path", "old.sq");
  let resolveOld!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string) => {
      const url = new URL(input, "http://localhost");
      if (url.searchParams.get("path") === "old.sq")
        return new Promise<Response>((resolve) => {
          resolveOld = resolve;
        });
      return Promise.resolve(
        new Response(
          JSON.stringify(url.pathname === "/sq/history" ? history : versions),
        ),
      );
    }),
  );
  const view = render(<HistoryPage />);
  params.set("path", "story/demo.sq");
  view.rerender(<HistoryPage />);
  await screen.findAllByText("수정한 번역");
  resolveOld(
    new Response(
      JSON.stringify({
        old: [{ id: 4, value: "Old response", editor: "old", editedDate }],
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.queryByText("Loading edits...")).toBeNull(),
  );
  expect(screen.queryByText("Old response")).toBeNull();
  expect(screen.getAllByText("수정한 번역").length).toBeGreaterThan(0);
});

it("filters files by path or latest editor and sorts the matching list", async () => {
  mockApi([
    { path: "zeta.sq", editor: "Alice", editedDate: 2 },
    { path: "alpha.sq", editor: "Bob", editedDate: 1 },
  ]);
  render(<HistoryPage />);
  await screen.findByRole("button", { name: /zeta.sq/ });
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Sort history files" }),
    "path",
  );
  expect(screen.getAllByRole("button")[0].textContent).toContain("alpha.sq");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search history files" }),
    "alice",
  );
  expect(screen.queryByRole("button", { name: /alpha.sq/ })).toBeNull();
  expect(screen.getByRole("button", { name: /zeta.sq/ })).toBeDefined();
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search history files" }),
    "missing",
  );
  expect(screen.getByText("No matching files.")).toBeDefined();
});
it("compares chosen versions and filters message text without changing server data", async () => {
  params.set("path", "story/demo.sq");
  const fetch = mockApi(history, {
    one: [
      { id: 3, key: "one", value: "안녕하세요!", editor: "Alice", editedDate },
      { id: 2, key: "one", value: "안녕하세요?", editor: "Bob", editedDate },
      { id: 1, key: "one", value: "안녕", editor: null, editedDate },
    ],
  });
  const view = render(<HistoryPage />);
  await screen.findByRole("combobox", { name: "Before version for one" });
  expect(view.container.querySelector("del")?.textContent).toBe("?");
  expect(view.container.querySelector("ins")?.textContent).toBe("!");
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Before version for one" }),
    "1",
  );
  expect(view.container.querySelector("ins")?.textContent).toBe("하세요!");
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "After version for one" }),
    "1",
  );
  expect(
    screen.getByText("No text changes between these versions."),
  ).toBeDefined();
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search message history" }),
    "missing",
  );
  expect(screen.getByText("No matching messages.")).toBeDefined();
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("preserves Unicode, whitespace and both empty values in changed text", () => {
  expect(changedText("😀안녕\n", "😀안녕하세요\n")).toEqual({
    prefix: "😀안녕",
    removed: "",
    added: "하세요",
    suffix: "\n",
  });
  expect(changedText("a b", "a  b")).toEqual({
    prefix: "a ",
    removed: "",
    added: " ",
    suffix: "b",
  });
  expect(changedText("same", "same")).toEqual({
    prefix: "same",
    removed: "",
    added: "",
    suffix: "",
  });
  expect(changedText("", "")).toEqual({
    prefix: "",
    removed: "",
    added: "",
    suffix: "",
  });
  expect(changedText("removed", "").removed).toBe("removed");
});
