import { useResource } from "@/hooks/use-resource";
import { request } from "@/api/client";
import { memo, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardFooter } from "@heroui/card";
import { useSearchParams } from "@/hooks/use-search-params";
import { changedText } from "@/util/history";
import { Link } from "@heroui/link";
import dayjs from "dayjs";

import DefaultLayout from "@/layouts/default";

type History = {
  path: string;
  editor: string;
  editedDate: number;
};

type Diff = {
  id: number;
  key: string;
  value: string | null;
  editedDate: number;
  editor: string | null;
};

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(false);
  const [diffError, setDiffError] = useState("");
  const [diff, setDiff] = useState<{ [key: string]: Diff[] }>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const path = searchParams.get("path");
  const lang = searchParams.get("lang") ?? "ko";
  const { error: fetchError, value: history } = useResource<History[]>(
    "/sq/history",
    { lang },
  );

  useEffect(() => {
    const abort = new AbortController();
    setDiff({});
    setDiffError("");
    setLoading(false);
    if (!path) return;
    setLoading(true);
    request<Record<string, Diff[]>>(
      "/sq/diff",
      { signal: abort.signal },
      { path, lang },
    )
      .then((value) => {
        if (!abort.signal.aborted) setDiff(value);
      })
      .catch((error: unknown) => {
        if (!abort.signal.aborted)
          setDiffError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [path, lang]);

  const visibleHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = (history ?? []).filter((item) =>
      `${item.path} ${item.editor}`.toLowerCase().includes(query),
    );
    return items.sort((a, b) =>
      sort === "path"
        ? a.path.localeCompare(b.path)
        : sort === "oldest"
          ? a.editedDate - b.editedDate
          : b.editedDate - a.editedDate,
    );
  }, [history, search, sort]);
  const visibleMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    return Object.entries(diff).filter(
      ([key, versions]) =>
        !query ||
        key.toLowerCase().includes(query) ||
        versions.some((item) =>
          `${item.value ?? ""} ${item.editor ?? ""}`
            .toLowerCase()
            .includes(query),
        ),
    );
  }, [diff, messageSearch]);

  return (
    <DefaultLayout>
      <section className="history-page grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
        <header className="page-heading lg:col-span-2">
          <h1>History</h1>
          <span className="language-tag">{lang}</span>
        </header>
        <div className="history-list min-h-60 max-h-72 overflow-auto rounded border border-default-300 p-2 lg:max-h-[calc(100vh-150px)]">
          <div className="history-tools">
            <input
              className="file-search"
              aria-label="Search history files"
              placeholder="Find a file or latest editor…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Sort history files"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="path">File name</option>
            </select>
            {history && (
              <span>
                {visibleHistory.length} / {history.length} files
                {history.length === 100 ? " (latest 100)" : ""}
              </span>
            )}
          </div>
          {fetchError && <p role="alert">{fetchError.message}</p>}
          {!fetchError && !history && <p role="status">Loading history...</p>}
          {history?.length === 0 && (
            <p className="history-empty" role="status">
              No edits yet for {lang}.
            </p>
          )}
          {history && history.length > 0 && visibleHistory.length === 0 && (
            <p className="history-empty" role="status">
              No matching files.
            </p>
          )}
          {visibleHistory.map(({ path, editedDate, editor }) => (
            <Card
              key={path}
              isPressable
              className="block my-1"
              aria-current={
                path === searchParams.get("path") ? "true" : undefined
              }
              onPress={() => {
                setSearchParams({ path, lang });
              }}
            >
              <CardHeader>
                <p className="font-bold">{path}</p>
              </CardHeader>

              <CardFooter className="flex flex-col items-start w-full">
                <p>Last updated by {editor}</p>
                <p>at {dayjs(editedDate).format("YYYY-MM-DD HH:mm:ss")}</p>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="history-diff min-h-60 min-w-0 overflow-auto rounded border border-default-300 p-3 whitespace-pre-wrap break-words">
          {!path && (
            <p className="history-empty">Select a file to view its edits.</p>
          )}
          {loading && <p role="status">Loading edits...</p>}
          {diffError && <p role="alert">{diffError}</p>}
          {path && !loading && !diffError && Object.keys(diff).length === 0 && (
            <p className="history-empty" role="status">
              No edits found for this file in {lang}.
            </p>
          )}
          {path && (
            <header className="history-detail-heading">
              <p className="editor-path">{path}</p>
              <Link href={`/?${new URLSearchParams({ path, lang })}`}>
                Open in editor
              </Link>
            </header>
          )}
          {path && !loading && Object.keys(diff).length > 0 && (
            <div className="history-tools">
              <input
                className="file-search"
                aria-label="Search message history"
                placeholder="Find text, message ID or editor…"
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
              />
              <span>
                {visibleMessages.length} / {Object.keys(diff).length} messages
              </span>
            </div>
          )}
          {!loading &&
            !diffError &&
            Object.keys(diff).length > 0 &&
            visibleMessages.length === 0 && (
              <p className="history-empty" role="status">
                No matching messages.
              </p>
            )}
          {visibleMessages.map(([key, versions]) => (
            <MessageHistory
              key={`${lang}:${path}:${key}`}
              message={key}
              versions={versions}
            />
          ))}
        </div>
      </section>
    </DefaultLayout>
  );
}

const MessageHistory = memo(function MessageHistory({
  message,
  versions,
}: {
  message: string;
  versions: Diff[];
}) {
  const [beforeId, setBeforeId] = useState(versions[1]?.id ?? 0);
  const [afterId, setAfterId] = useState(versions[0]?.id ?? 0);
  const before = versions.find((item) => item.id === beforeId);
  const after = versions.find((item) => item.id === afterId);
  const change = changedText(before?.value ?? "", after?.value ?? "");
  const same = (before?.value ?? null) === (after?.value ?? null);
  return (
    <section className="message-history" aria-label={`History for ${message}`}>
      <header>
        <h2>{message}</h2>
        <span>{versions.length} versions</span>
      </header>
      <div className="version-comparison">
        <div className="version-before">
          <label>
            Before
            <select
              aria-label={`Before version for ${message}`}
              value={beforeId}
              onChange={(event) => setBeforeId(Number(event.target.value))}
            >
              <option value={0}>No translation</option>
              {versions.map((item) => (
                <option key={item.id} value={item.id}>
                  {versionLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <p dir="auto">
            {before?.value === null || !before ? (
              "(No translation)"
            ) : before.value === "" ? (
              "(Empty translation)"
            ) : (
              <>
                {change.prefix}
                {change.removed && <del>{change.removed}</del>}
                {change.suffix}
              </>
            )}
          </p>
        </div>
        <div className="version-after">
          <label>
            After
            <select
              aria-label={`After version for ${message}`}
              value={afterId}
              onChange={(event) => setAfterId(Number(event.target.value))}
            >
              {versions.map((item) => (
                <option key={item.id} value={item.id}>
                  {versionLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <p dir="auto">
            {after?.value === null || !after ? (
              "(No translation)"
            ) : after.value === "" ? (
              "(Empty translation)"
            ) : (
              <>
                {change.prefix}
                {change.added && <ins>{change.added}</ins>}
                {change.suffix}
              </>
            )}
          </p>
        </div>
      </div>
      {same && (
        <p className="history-note">No text changes between these versions.</p>
      )}
      <details className="version-timeline">
        <summary>All versions ({versions.length})</summary>
        {versions.map(({ id, value, editor, editedDate }) => (
          <div key={id} className="version-record">
            <p className="font-bold">
              {editor
                ? `Edited by ${editor} at ${dayjs(editedDate).format("YYYY-MM-DD HH:mm:ss")}`
                : "Original"}
            </p>
            <p dir="auto">
              {value === null
                ? "(No translation)"
                : value === ""
                  ? "(Empty translation)"
                  : value}
            </p>
          </div>
        ))}
      </details>
    </section>
  );
});
function versionLabel(item: Diff) {
  return `${item.editor ?? "Original"} — ${dayjs(item.editedDate).format("YYYY-MM-DD HH:mm:ss")} (#${item.id})`;
}
