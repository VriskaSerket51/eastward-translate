import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "@/api/client";
import {
  acknowledgeDraft,
  rowsFromData,
  type Draft,
  type TranslationData,
} from "@/util/translations";
import { getProfileName } from "@/util/name";

const STORAGE = "eastward-translate-drafts-v1";
export function useTranslationEditor(path: string | null, language: string) {
  const context = JSON.stringify([path, language]);
  const drafts = useRef<Record<string, Draft>>({});
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<{
    context: string;
    data: TranslationData;
  }>();
  const [reloadVersion, setReloadVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? "{}");
      if (value && typeof value === "object")
        for (const [key, draft] of Object.entries(value)) {
          if (draft && typeof draft === "object")
            drafts.current[key] = Object.fromEntries(
              Object.entries(draft).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
              ),
            );
        }
    } catch {
      /* A damaged saved draft must not prevent opening assets. */
    }
    setReady(true);
  }, []);
  const persist = useCallback(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(drafts.current));
    } catch {
      setError(
        "브라우저에 임시 저장하지 못했습니다. 저장 또는 JSON 내보내기를 사용하세요.",
      );
    }
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    if (!path) return;
    const abort = new AbortController();
    setLoading(true);
    setError("");
    request<TranslationData>(
      "/sq/value",
      { signal: abort.signal },
      { path, lang: language },
    )
      .then((data) => {
        if (!abort.signal.aborted) setLoaded({ context, data });
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [context, language, path, reloadVersion]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        Object.values(drafts.current).some((draft) => Object.keys(draft).length)
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const change = useCallback(
    (key: string, value: string, original: string) => {
      const draft = (drafts.current[context] ??= {});
      if (value === original) delete draft[key];
      else
        Object.defineProperty(draft, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      persist();
    },
    [context, persist],
  );
  const save = useCallback(async () => {
    if (!path || saving || !ready || loaded?.context !== context) return;
    const snapshot = { ...drafts.current[context] };
    const baselines = new Map(
      rowsFromData(loaded.data)
        .filter((row) => row.key)
        .map((row) => [row.key!, row.values[language]]),
    );
    if (!Object.keys(snapshot).length) return;
    setSaving(true);
    setError("");
    try {
      await request("/sq/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          lang: language,
          editor: getProfileName(),
          translations: Object.entries(snapshot).map(([key, value]) => {
            const baseline = baselines.get(key);
            return {
              key,
              value,
              expectedValue: typeof baseline === "string" ? baseline : null,
            };
          }),
        }),
      });
      drafts.current[context] = acknowledgeDraft(
        drafts.current[context] ?? {},
        snapshot,
      );
      setLoaded((previous) => {
        if (previous?.context !== context) return previous;
        const data = structuredClone(previous.data);
        function update(node: NonNullable<TranslationData["script"]>) {
          if (node.directive && Object.hasOwn(snapshot, node.directive))
            node[language] = snapshot[node.directive];
          for (const child of node.children ?? []) update(child);
        }
        if (data.script) update(data.script);
        for (const [key, row] of Object.entries(data.csv ?? {}))
          if (Object.hasOwn(snapshot, key)) row[language] = snapshot[key];
        return { context, data };
      });
      persist();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }, [context, language, loaded, path, persist, ready, saving]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [save]);
  void revision;
  return {
    data: loaded?.context === context ? loaded.data : {},
    draft: drafts.current[context] ?? {},
    ready,
    loading,
    saving,
    error,
    change,
    save,
    reload: () => setReloadVersion((value) => value + 1),
  };
}
