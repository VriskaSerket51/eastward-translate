import { EnglishUi } from "./web-render";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useTranslationEditor } from "../src/hooks/use-translation-editor";
import {
  acknowledgeDraft,
  matchesView,
  rowsFromData,
  getPercent,
} from "../src/util/translations";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe("translation data", () => {
  it("preserves message IDs and context including empty target strings", () => {
    expect(
      rowsFromData({
        script: {
          type: "root",
          children: [
            {
              type: "if",
              args: ["flag"],
              children: [{ directive: "stable-id", ko: "", en: "line" }],
            },
          ],
        },
      }).map((row) => row.key),
    ).toEqual([undefined, "stable-id"]);
    expect(
      acknowledgeDraft(
        { a: "edited during save", b: "same" },
        { a: "old", b: "same" },
      ),
    ).toEqual({ a: "edited during save" });
    expect(matchesView("farm/demo", "dlc")).toBe(false);
    expect(getPercent({ total: 0, remain: 0 })).toBe(0);
  });
  it("keeps drafts across asset changes and does not erase changes made during saving", async () => {
    let resolveSave: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.includes("translate")
          ? new Promise((resolve) => {
              resolveSave = resolve;
            })
          : Promise.resolve(
              new Response(JSON.stringify({ csv: { key: { ko: "old" } } }), {
                status: 200,
              }),
            ),
      ),
    );
    const hook = renderHook(({ path }) => useTranslationEditor(path, "ko"), {
      wrapper: EnglishUi,
      initialProps: { path: "first" },
    });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await waitFor(() => expect(hook.result.current.data.csv).toBeDefined());
    act(() => hook.result.current.change("key", "saved", "old"));
    let saved: Promise<void> = Promise.resolve();
    act(() => {
      saved = hook.result.current.save();
    });
    act(() => hook.result.current.change("key", "new draft", "old"));
    await act(async () => {
      resolveSave(new Response("{}", { status: 200 }));
      await saved;
    });
    expect(hook.result.current.draft.key).toBe("new draft");
    hook.rerender({ path: "second" });
    await waitFor(() => expect(hook.result.current.data.csv).toBeDefined());
    expect(hook.result.current.draft.key).toBeUndefined();
    hook.rerender({ path: "first" });
    await waitFor(() => expect(hook.result.current.data.csv).toBeDefined());
    expect(hook.result.current.draft.key).toBe("new draft");
  });
  it("ignores a delayed response after changing assets", async () => {
    let first: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.includes("path=first")
          ? new Promise((resolve) => {
              first = resolve;
            })
          : Promise.resolve(
              new Response(
                JSON.stringify({ csv: { second: { en: "current" } } }),
                { status: 200 },
              ),
            ),
      ),
    );
    const hook = renderHook(({ path }) => useTranslationEditor(path, "fr"), {
      wrapper: EnglishUi,
      initialProps: { path: "first" },
    });
    hook.rerender({ path: "second" });
    await waitFor(() =>
      expect(hook.result.current.data.csv?.second).toBeDefined(),
    );
    await act(async () => {
      first(
        new Response(JSON.stringify({ csv: { first: { en: "late" } } }), {
          status: 200,
        }),
      );
    });
    expect(hook.result.current.data.csv?.second).toBeDefined();
    expect(hook.result.current.data.csv?.first).toBeUndefined();
  });
  it("retains drafts after an HTTP save failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          new Response(
            url.includes("translate")
              ? "failed"
              : JSON.stringify({ csv: { key: { ko: "old" } } }),
            { status: url.includes("translate") ? 500 : 200 },
          ),
        ),
      ),
    );
    const hook = renderHook(() => useTranslationEditor("test", "ko"), {
      wrapper: EnglishUi,
    });
    await waitFor(() => expect(hook.result.current.data.csv).toBeDefined());
    act(() => hook.result.current.change("key", "", "old"));
    await act(async () => hook.result.current.save());
    expect(hook.result.current.draft.key).toBe("");
    expect(hook.result.current.error).toContain("500");
  });
});
